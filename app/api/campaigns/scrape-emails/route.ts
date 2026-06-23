import { NextResponse } from "next/server";
import { promises as dns } from "dns";

const FALLBACK_PREFIXES = ["hello", "info", "contact", "marketing", "partnerships", "press", "sales"];
const PAGES_TO_TRY = ["", "/contact", "/about", "/company", "/contact-us"];

async function hasMx(domain: string): Promise<boolean> {
  try {
    const records = await dns.resolveMx(domain);
    return records && records.length > 0;
  } catch {
    return false;
  }
}

async function fetchPage(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(6000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; emailscraper/1.0)" },
    });
    if (!res.ok) return "";
    return await res.text();
  } catch {
    return "";
  }
}

function extractEmails(html: string, domain: string): string[] {
  const found = new Set<string>();

  // mailto: links
  const mailtoRe = /mailto:([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/gi;
  let m: RegExpExecArray | null;
  while ((m = mailtoRe.exec(html)) !== null) {
    found.add(m[1].toLowerCase());
  }

  // plain text emails on same domain (avoids random third-party addresses)
  const plainRe = /\b([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})\b/g;
  while ((m = plainRe.exec(html)) !== null) {
    const email = m[1].toLowerCase();
    if (email.endsWith("@" + domain) || email.endsWith("." + domain)) {
      found.add(email);
    }
  }

  return [...found];
}

async function findEmail(domain: string): Promise<{ email: string | null; source: string }> {
  // Skip clearly invalid domains
  if (!domain || !domain.includes(".")) return { email: null, source: "invalid domain" };

  const domainOk = await hasMx(domain);
  if (!domainOk) return { email: null, source: "no MX record" };

  // Try scraping pages
  for (const path of PAGES_TO_TRY) {
    const url = `https://${domain}${path}`;
    const html = await fetchPage(url);
    if (!html) continue;
    const emails = extractEmails(html, domain);
    // Prefer marketing/partnerships/press emails
    const preferred = emails.find(e =>
      /\b(market|partner|press|hello|contact|info|sales|sponsor)\b/i.test(e.split("@")[0])
    );
    if (preferred) return { email: preferred, source: `scraped from ${url}` };
    if (emails.length > 0) return { email: emails[0], source: `scraped from ${url}` };
  }

  // Fallback: try common prefixes and verify with MX (we already know MX is good)
  for (const prefix of FALLBACK_PREFIXES) {
    const email = `${prefix}@${domain}`;
    // We can't verify individual mailboxes without SMTP, so just return the best guess
    if (prefix === "hello" || prefix === "info" || prefix === "contact") {
      return { email, source: "pattern fallback (MX verified domain)" };
    }
  }

  return { email: `hello@${domain}`, source: "pattern fallback (MX verified domain)" };
}

export async function POST(req: Request) {
  const { leads } = await req.json();
  if (!Array.isArray(leads)) {
    return NextResponse.json({ error: "leads must be an array with {company, domain} fields" }, { status: 400 });
  }

  const results = await Promise.all(
    leads.map(async (lead: { company: string; domain: string; [key: string]: any }) => {
      const { email, source } = await findEmail(lead.domain?.toLowerCase().trim());
      return { ...lead, email: email || "", email_source: source };
    })
  );

  return NextResponse.json({ leads: results });
}
