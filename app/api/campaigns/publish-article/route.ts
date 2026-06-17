import { NextResponse } from "next/server";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "";
const REPO = "alonbraun/neurotech-hub";

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 60);
}

export async function POST(req: Request) {
  const { title, excerpt, category, body, client_company, campaign_name } = await req.json();

  if (!title || !body) {
    return NextResponse.json({ error: "Missing title or body" }, { status: 400 });
  }

  const today = new Date().toISOString().split("T")[0];
  const slug = `${today}-${slugify(title)}`;
  const path = `content/news/${slug}.md`;

  const markdown = `---
title: "${title.replace(/"/g, '\\"')}"
date: "${today}"
category: "${category || "Industry"}"
excerpt: "${(excerpt || "").replace(/"/g, '\\"')}"
sponsored: true
sponsored_by: "${client_company}"
campaign: "${campaign_name || ""}"
---

${body}
`;

  const content = Buffer.from(markdown).toString("base64");
  const apiUrl = `https://api.github.com/repos/${REPO}/contents/${path}`;
  const headers = {
    Authorization: `token ${GITHUB_TOKEN}`,
    "Content-Type": "application/json",
    "User-Agent": "neurotech/1.0",
  };

  // Check if file exists (get SHA)
  let sha: string | undefined;
  try {
    const check = await fetch(apiUrl, { headers });
    if (check.ok) sha = (await check.json()).sha;
  } catch {}

  const payload: Record<string, string> = {
    message: `feat: sponsored article for ${client_company} campaign`,
    content,
  };
  if (sha) payload.sha = sha;

  try {
    const res = await fetch(apiUrl, {
      method: "PUT",
      headers,
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json();
      return NextResponse.json({ error: err.message || "GitHub push failed" }, { status: 500 });
    }
    const articleUrl = `https://neurotech.com/news/${slug}`;
    return NextResponse.json({ success: true, slug, path, url: articleUrl });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
