import { NextResponse } from "next/server";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "";
const REPO = "alonbraun/neurotech-hub";

export async function POST(req: Request) {
  const { from_addr } = await req.json();
  if (!from_addr || !GITHUB_TOKEN) return NextResponse.json({ ok: true });

  const path = "content/inbox/sent-log.json";
  const apiUrl = `https://api.github.com/repos/${REPO}/contents/${path}`;
  const headers = {
    Authorization: `token ${GITHUB_TOKEN}`,
    "Content-Type": "application/json",
    "User-Agent": "neurotech/1.0",
  };

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

  existing.push({ to: from_addr, subject: "(manually marked)", sent_at: new Date().toISOString() });

  const content = Buffer.from(JSON.stringify(existing, null, 2)).toString("base64");
  const body: Record<string, string> = { message: `inbox: mark replied ${from_addr}`, content };
  if (sha) body.sha = sha;

  await fetch(apiUrl, { method: "PUT", headers, body: JSON.stringify(body) });
  return NextResponse.json({ ok: true });
}
