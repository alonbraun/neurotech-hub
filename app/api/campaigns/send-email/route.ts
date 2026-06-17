import { NextResponse } from "next/server";

const RESEND_KEY = process.env.RESEND_API_KEY || "";

export async function POST(req: Request) {
  const { campaign_name, client_company, to_name, to_email, subject, body } = await req.json();

  if (!to_email || !subject || !body) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const footer = `\n\n---\nThis message was sent on behalf of ${client_company} by NeuroTech.com\nNeuroTech.com is the neurotechnology industry's professional directory and network.\nTo unsubscribe, reply with "unsubscribe" in the subject line.`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `NeuroTech.com <hello@neurotech.com>`,
        to: [to_email],
        subject,
        text: body + footer,
        reply_to: "hello@neurotech.com",
        tags: [
          { name: "campaign", value: campaign_name.replace(/[^a-z0-9_-]/gi, "_").slice(0, 36) },
          { name: "type", value: "b2b_campaign" },
        ],
      }),
    });
    const data = await res.json();
    if (!res.ok) return NextResponse.json({ error: data.message || "Send failed" }, { status: 500 });
    return NextResponse.json({ success: true, id: data.id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
