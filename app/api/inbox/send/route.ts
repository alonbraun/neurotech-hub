import { NextResponse } from "next/server";

const RESEND_KEY = process.env.RESEND_API_KEY || "";
const FROM = "NeuroTech.com Team <hello@neurotech.com>";

export async function POST(req: Request) {
  const { to, subject, body, in_reply_to } = await req.json();

  if (!to || !subject || !body) {
    return NextResponse.json({ error: "Missing to, subject, or body" }, { status: 400 });
  }

  const replySubject = subject.startsWith("Re:") ? subject : `Re: ${subject}`;

  const headers: Record<string, string> = {};
  if (in_reply_to) {
    headers["In-Reply-To"] = in_reply_to;
    headers["References"] = in_reply_to;
  }

  const emailBody = `${body}\n\n---\nNeuroTech.com | The Neurotechnology Industry Directory\nhttps://neurotech.com`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: [to],
        subject: replySubject,
        text: emailBody,
        reply_to: "hello@neurotech.com",
        headers,
      }),
    });
    const data = await res.json();
    if (!res.ok) return NextResponse.json({ error: data.message || "Send failed" }, { status: 500 });
    return NextResponse.json({ success: true, id: data.id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
