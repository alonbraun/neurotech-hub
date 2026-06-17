import { NextResponse } from "next/server";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "";
const REPO = "alonbraun/neurotech-hub";
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || "";

async function generateLinkedInPost(
  client_company: string,
  client_description: string,
  article_title: string,
  article_url: string,
  campaign_goal: string
): Promise<string> {
  const prompt = `Write a LinkedIn post for the NeuroTech.com company page featuring ${client_company}.

About ${client_company}: ${client_description}
Campaign goal: ${campaign_goal}
Article on neurotech.com: "${article_title}" — ${article_url}

The post should:
- Open with a compelling hook (not "We're excited to...")
- 3-5 short paragraphs
- Mention ${client_company} naturally as a company doing interesting work in the space
- Reference or link to the article on neurotech.com
- 3-4 relevant hashtags at the end (#neurotechnology #BCI #neuroscience etc.)
- Tone: industry thought-leadership, not promotional
- Note that ${client_company} can reshare this post if they wish

Return only the post text, no extra commentary.`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await res.json();
  return data.content?.[0]?.text?.trim() || "";
}

export async function POST(req: Request) {
  const { client_company, client_description, campaign_goal, article_title, article_url, campaign_name } = await req.json();

  // Generate the post copy
  let post_text = "";
  try {
    post_text = await generateLinkedInPost(
      client_company,
      client_description,
      article_title,
      article_url,
      campaign_goal
    );
  } catch (err: any) {
    return NextResponse.json({ error: `Claude error: ${err.message}` }, { status: 500 });
  }

  // Write to queue file in GitHub
  const queueId = `${Date.now()}-${client_company.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
  const path = `content/linkedin-queue/${queueId}.json`;
  const payload = {
    id: queueId,
    campaign: campaign_name,
    client_company,
    article_url,
    post_text,
    channel_id: "6a30f22738b55793459dfac5", // neurotech.com LinkedIn channel
    queued_at: new Date().toISOString(),
    status: "queued",
  };

  const content = Buffer.from(JSON.stringify(payload, null, 2)).toString("base64");
  const apiUrl = `https://api.github.com/repos/${REPO}/contents/${path}`;
  const headers = {
    Authorization: `token ${GITHUB_TOKEN}`,
    "Content-Type": "application/json",
    "User-Agent": "neurotech/1.0",
  };

  try {
    const res = await fetch(apiUrl, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        message: `feat: queue LinkedIn post for ${client_company} campaign`,
        content,
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      return NextResponse.json({ error: err.message || "Queue write failed" }, { status: 500 });
    }
    return NextResponse.json({ success: true, post_text, queue_id: queueId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
