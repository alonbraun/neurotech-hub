import { NextResponse } from "next/server";

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || "";

export async function POST(req: Request) {
  const { company, target_description, count = 20 } = await req.json();

  const prompt = `Generate ${count} realistic B2B leads in the neurotechnology industry for a campaign targeting: "${target_description}"

The campaign is being run on behalf of: ${company}

Return a JSON array of leads. Each lead should be a realistic industry professional. Use real company names in the neurotech/neuroscience space (research institutions, medical device companies, pharma, BCI companies, hospitals, VCs in the space, etc.).

Format:
[
  {
    "name": "First Last",
    "title": "Job Title",
    "company": "Company Name",
    "email": "firstname.lastname@company.com",
    "linkedin": "linkedin.com/in/firstlast",
    "relevance": "One sentence why they're relevant to this campaign"
  }
]

Return only valid JSON array, no other text.`;

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
        max_tokens: 2000,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const data = await res.json();
    if (data.error) return NextResponse.json({ error: data.error.message || JSON.stringify(data.error) }, { status: 500 });
    let text = data.content?.[0]?.text?.trim() || "[]";
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    const leads = JSON.parse(text);
    return NextResponse.json({ leads });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
