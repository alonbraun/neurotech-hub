import { NextResponse } from "next/server";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "";
const REPO = "alonbraun/neurotech-hub";

export async function GET() {
  if (!GITHUB_TOKEN) return NextResponse.json({ emails: [] });
  try {
    const res = await fetch(
      `https://api.github.com/repos/${REPO}/contents/content/campaigns/sent-leads.json`,
      { headers: { Authorization: `token ${GITHUB_TOKEN}`, "User-Agent": "neurotech/1.0" } }
    );
    if (!res.ok) return NextResponse.json({ emails: [] });
    const file = await res.json();
    const leads = JSON.parse(Buffer.from(file.content, "base64").toString());
    const emails = [...new Set(leads.map((l: any) => l.email.toLowerCase()))];
    return NextResponse.json({ emails });
  } catch {
    return NextResponse.json({ emails: [] });
  }
}
