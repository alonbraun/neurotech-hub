import { NextResponse } from "next/server";

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || "";

export async function POST(req: Request) {
  const { client_company, client_description, campaign_goal, article_angle } = await req.json();

  const prompt = `Write a sponsored editorial article for NeuroTech.com about ${client_company}.

Company description: ${client_description}
Campaign goal: ${campaign_goal}
Article angle/focus: ${article_angle || `${client_company}'s work and impact in neurotechnology`}

Requirements:
- 450-550 words
- Written as a professional editorial feature (not a press release)
- Tone: authoritative, informative, industry-insider perspective
- Highlight the company's innovation, team, or market position
- Include 2-3 specific details that make it feel real and researched
- End with a forward-looking statement about their roadmap or vision
- Do NOT use first person

Return JSON:
{
  "title": "Compelling article title (under 80 chars)",
  "excerpt": "2-sentence summary for SEO/preview (under 160 chars)",
  "category": "one of: BCIs | Cognitive Health | Neuromodulation | Neuropharmaceuticals | Neurodiagnostics | Research Tools | Neurofeedback | Mental Health Tech",
  "body": "Full article in markdown. Use ## for subheadings. 3-4 paragraphs."
}

Return only valid JSON.`;

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
        max_tokens: 1500,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const data = await res.json();
    const text = data.content?.[0]?.text?.trim() || "{}";
    const article = JSON.parse(text);
    return NextResponse.json(article);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
