import { NextResponse } from "next/server";

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || "";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "";
const REPO = "alonbraun/neurotech-hub";

async function loadVoiceGuidelines(): Promise<string> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${REPO}/contents/content/campaigns/voice-guidelines.md`,
      { headers: { Authorization: `token ${GITHUB_TOKEN}`, "User-Agent": "neurotech/1.0" } }
    );
    if (!res.ok) return "";
    const file = await res.json();
    return Buffer.from(file.content, "base64").toString().trim();
  } catch { return ""; }
}

export async function POST(req: Request) {
  const { client_company, client_description, campaign_goal, lead, sequence_step = 1, article_url, article_title, remarks } = await req.json();

  const stepContextMap: Record<number, string> = {
    1: "First touch — introduce NeuroTech.com and the advertising opportunity. Be curious, not salesy.",
    2: "Follow-up (sent 3 days after no reply) — light nudge, add a specific point of relevance to their work.",
    3: "Final touch (sent 7 days after step 2 with no reply) — brief, no pressure, leave door open.",
  };
  const stepContext = stepContextMap[sequence_step] || "First touch.";

  const articleContext = article_url
    ? `\nThere is a feature article about ${client_company} published on NeuroTech.com: "${article_title}" — ${article_url}\nNaturally reference or link to this article in the email.`
    : "";

  const remarksContext = remarks
    ? `\nSpecific feedback to incorporate in this version: ${remarks}`
    : "";

  const voiceGuidelines = await loadVoiceGuidelines();
  const voiceContext = voiceGuidelines
    ? `\n\nVoice & style guidelines (always follow these):\n${voiceGuidelines}`
    : "";

  const prompt = `You write outreach emails for NeuroTech.com, a neurotechnology industry news and directory portal.

Campaign: ${campaign_goal}
Sequence step: ${sequence_step} — ${stepContext}
${articleContext}${remarksContext}${voiceContext}

Lead:
- Name: ${lead.name}
- Title: ${lead.title}
- Company: ${lead.company}
- Why relevant: ${lead.relevance || "Industry professional"}

Write a personalized cold outreach email. Rules:
- Subject line: specific and intriguing, not generic
- Opening: reference something specific about their role or company — NOT "I hope this email finds you well"
- Body: 3-4 short paragraphs max
- Never mention specific audience size numbers (don't say "50,000 readers" or any made-up figures)
- Describe the audience qualitatively: "researchers, clinicians, founders, and investors in neurotechnology"
- Clear but soft call to action — invite them to reply or check out neurotech.com/advertise
- Sign off as: "Alon Braun\nNeuroTech.com"
- Tone: founder-to-founder, direct, warm, not corporate or templated

Return JSON: {"subject": "...", "body": "..."}
Return only valid JSON, no other text.`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 700,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const data = await res.json();
    if (data.error) return NextResponse.json({ error: data.error.message || JSON.stringify(data.error) }, { status: 500 });
    let text = data.content?.[0]?.text?.trim() || "{}";
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    const email = JSON.parse(text);
    return NextResponse.json(email);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
