import { NextResponse } from "next/server";

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || "";

export async function POST(req: Request) {
  const { email, thread } = await req.json();

  const threadContext = (thread || [])
    .map((m: any) =>
      `[${m.folder === "Sent" ? "YOU SENT" : "THEY SENT"} | ${m.date?.slice(0, 10)}]\nSubject: ${m.subject}\n${m.body?.slice(0, 500)}`
    )
    .join("\n\n---\n\n");

  const prompt = `You manage the inbox for NeuroTech.com — an industry directory for neurotechnology companies (200+ companies listed).

Products we offer:
- Featured Listing: $199/month — company profile at the top of search results, logo on homepage
- Job Posting: $250/post — reach active neurotech job seekers, promoted in newsletter
- Newsletter Sponsorship: $500/issue — 1,000+ subscribers
- Sponsored Article: $500 — written by our team, published on neurotech.com
- B2B Outreach Campaign: $1,500 — we run a targeted outreach campaign to industry professionals on their behalf (new product)

Full conversation thread with this contact:
${threadContext || "(no prior history)"}

Latest incoming message:
From: ${email.from}
Subject: ${email.subject}
Date: ${email.date?.slice(0, 10)}
Body:
${email.body}

Write a short, natural reply email. Rules:
- DO NOT repeat pitches already made in prior emails
- Reference something specific they said
- Sound like a real person, not a template
- Maximum 4-5 sentences
- If they're asking about pricing, give the number directly
- If they seem uninterested, be gracious and leave the door open
- If it looks like a buying signal, make it easy to move forward (tell them to reply or go to neurotech.com/advertise)
- Sign off as: The NeuroTech.com Team

Return ONLY the email body. No subject line. No "Dear X". Start with the actual reply text.`;

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
        max_tokens: 400,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const data = await res.json();
    const reply = data.content?.[0]?.text?.trim() || "";
    return NextResponse.json({ reply });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
