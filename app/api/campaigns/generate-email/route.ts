import { NextResponse } from "next/server";

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || "";

export async function POST(req: Request) {
  const { client_company, client_description, campaign_goal, lead, sequence_step = 1 } = await req.json();

  const stepContextMap: Record<number, string> = {
    1: "First touch — introduce the company and its value proposition. Be curious, not salesy.",
    2: "Follow-up (sent 3 days after no reply) — light nudge, add a specific point of relevance to their work.",
    3: "Final touch (sent 7 days after step 2 with no reply) — brief, no pressure, leave door open.",
  };
  const stepContext = stepContextMap[sequence_step] || "First touch.";

  const prompt = `You write outreach emails for neurotechnology companies. These emails go out under the NeuroTech.com brand on behalf of a client.

Client company: ${client_company}
Client description: ${client_description}
Campaign goal: ${campaign_goal}
Sequence step: ${sequence_step} — ${stepContext}

Lead:
- Name: ${lead.name}
- Title: ${lead.title}
- Company: ${lead.company}
- Why relevant: ${lead.relevance || "Industry professional"}

Write a personalized email for this specific lead. Rules:
- Subject line should be specific and intriguing (not generic)
- Opening should reference something about their role or company — NOT "I hope this email finds you well"
- Body: 3-4 short paragraphs max
- Clear but soft call to action
- Signed: "The NeuroTech.com Team, on behalf of ${client_company}"
- Tone: professional but warm, peer-to-peer, not corporate

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
        max_tokens: 600,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const data = await res.json();
    const text = data.content?.[0]?.text?.trim() || "{}";
    const email = JSON.parse(text);
    return NextResponse.json(email);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
