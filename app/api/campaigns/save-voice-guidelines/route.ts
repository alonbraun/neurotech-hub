import { NextResponse } from "next/server";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "";
const REPO = "alonbraun/neurotech-hub";

export async function POST(req: Request) {
  const { guidelines } = await req.json();
  if (!guidelines || !GITHUB_TOKEN) return NextResponse.json({ error: "Missing guidelines or token" }, { status: 400 });

  const path = "content/campaigns/voice-guidelines.md";
  const apiUrl = `https://api.github.com/repos/${REPO}/contents/${path}`;
  const headers = {
    Authorization: `token ${GITHUB_TOKEN}`,
    "Content-Type": "application/json",
    "User-Agent": "neurotech/1.0",
  };

  let sha: string | undefined;
  try {
    const res = await fetch(apiUrl, { headers });
    if (res.ok) sha = (await res.json()).sha;
  } catch {}

  const content = Buffer.from(guidelines).toString("base64");
  const body: Record<string, string> = { message: "update campaign voice guidelines", content };
  if (sha) body.sha = sha;

  const res = await fetch(apiUrl, { method: "PUT", headers, body: JSON.stringify(body) });
  if (!res.ok) return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
