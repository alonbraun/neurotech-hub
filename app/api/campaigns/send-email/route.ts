import { NextResponse } from "next/server";

const RESEND_KEY = process.env.RESEND_API_KEY || "";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "";
const REPO = "alonbraun/neurotech-hub";

async function logSentLead(to_email: string, to_name: string, campaign_name: string, client_company: string, subject: string) {
  if (!GITHUB_TOKEN) return;
  const path = "content/campaigns/sent-leads.json";
  const apiUrl = `https://api.github.com/repos/${REPO}/contents/${path}`;
  const headers = { Authorization: `token ${GITHUB_TOKEN}`, "Content-Type": "application/json", "User-Agent": "neurotech/1.0" };

  let existing: any[] = [];
  let sha: string | undefined;
  try {
    const res = await fetch(apiUrl, { headers });
    if (res.ok) {
      const file = await res.json();
      sha = file.sha;
      existing = JSON.parse(Buffer.from(file.content, "base64").toString());
    }
  } catch {}

  existing.push({
    email: to_email.toLowerCase(),
    name: to_name,
    campaign: campaign_name,
    client: client_company,
    subject,
    sent_at: new Date().toISOString(),
  });

  const content = Buffer.from(JSON.stringify(existing, null, 2)).toString("base64");
  const body: Record<string, string> = { message: `campaign: log sent to ${to_email}`, content };
  if (sha) body.sha = sha;
  await fetch(apiUrl, { method: "PUT", headers, body: JSON.stringify(body) }).catch(() => {});
}

export async function POST(req: Request) {
  const { campaign_name, client_company, to_name, to_email, subject, body } = await req.json();

  if (!to_email || !subject || !body) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const footer = `\n\n---\nAlon Braun\nNeuroTech.com — The Neurotechnology Industry Directory\nhttps://neurotech.com\n\nTo unsubscribe, reply with "unsubscribe" in the subject line.`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `Alon Braun <hello@neurotech.com>`,
        to: [to_email],
        subject,
        text: body + footer,
        reply_to: "hello@neurotech.com",
        tags: [
          { name: "campaign", value: campaign_name.replace(/[^a-z0-9_-]/gi, "_").slice(0, 36) },
          { name: "type", value: "b2b_campaign" },
        ],
      }),
    });
    const data = await res.json();
    if (!res.ok) return NextResponse.json({ error: data.message || "Send failed" }, { status: 500 });

    await logSentLead(to_email, to_name, campaign_name, client_company, subject);
    return NextResponse.json({ success: true, id: data.id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
