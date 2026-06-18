import { NextResponse } from "next/server";
import { promises as dns } from "dns";

const HUNTER_KEY = process.env.HUNTER_API_KEY || "";

async function checkMx(domain: string): Promise<boolean> {
  try {
    const records = await dns.resolveMx(domain);
    return records && records.length > 0;
  } catch (err: any) {
    if (err.code === "ENOTFOUND" || err.code === "ENODATA" || err.code === "ESERVFAIL") return false;
    return true; // transient DNS error — don't block
  }
}

async function hunterVerify(email: string): Promise<{ status: string; score: number } | null> {
  if (!HUNTER_KEY) return null;
  try {
    const res = await fetch(
      `https://api.hunter.io/v2/email-verifier?email=${encodeURIComponent(email)}&api_key=${HUNTER_KEY}`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return { status: data.data?.status, score: data.data?.score ?? 0 };
  } catch {
    return null;
  }
}

async function checkEmail(email: string): Promise<{ email: string; valid: boolean; reason: string }> {
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain || !email.includes("@")) return { email, valid: false, reason: "Invalid format" };

  // Step 1: MX check (fast, free)
  const hasMx = await checkMx(domain);
  if (!hasMx) return { email, valid: false, reason: "Domain has no mail server" };

  // Step 2: Hunter.io mailbox verification (if key set)
  const hunter = await hunterVerify(email);
  if (hunter) {
    if (hunter.status === "invalid") return { email, valid: false, reason: "Mailbox does not exist" };
    if (hunter.status === "disposable") return { email, valid: false, reason: "Disposable email" };
    if (hunter.status === "valid") return { email, valid: true, reason: "" };
    if (hunter.status === "unknown" && hunter.score < 40) return { email, valid: false, reason: `Low deliverability score (${hunter.score})` };
  }

  return { email, valid: true, reason: "" };
}

export async function POST(req: Request) {
  const { emails } = await req.json();
  if (!Array.isArray(emails)) return NextResponse.json({ error: "emails must be an array" }, { status: 400 });

  const results = await Promise.all(emails.map(checkEmail));
  const hunterUsed = !!HUNTER_KEY;
  return NextResponse.json({ results, hunter_used: hunterUsed });
}
