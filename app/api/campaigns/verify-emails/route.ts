import { NextResponse } from "next/server";
import { promises as dns } from "dns";

async function checkMx(email: string): Promise<{ email: string; valid: boolean; reason: string }> {
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return { email, valid: false, reason: "Invalid email format" };
  try {
    const records = await dns.resolveMx(domain);
    if (records && records.length > 0) {
      return { email, valid: true, reason: "" };
    }
    return { email, valid: false, reason: "No MX records" };
  } catch (err: any) {
    if (err.code === "ENOTFOUND" || err.code === "ENODATA" || err.code === "ESERVFAIL") {
      return { email, valid: false, reason: "Domain not found" };
    }
    // DNS timeout or other transient error — treat as unknown, don't block
    return { email, valid: true, reason: "DNS check inconclusive" };
  }
}

export async function POST(req: Request) {
  const { emails } = await req.json();
  if (!Array.isArray(emails)) return NextResponse.json({ error: "emails must be an array" }, { status: 400 });

  // Run all checks in parallel
  const results = await Promise.all(emails.map(checkMx));
  return NextResponse.json({ results });
}
