import { NextRequest, NextResponse } from "next/server";

const AUDIENCE_ID = process.env.NEUROTECH_AUDIENCE_ID || "";

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

  if (process.env.RESEND_API_KEY && AUDIENCE_ID) {
    await fetch(`https://api.resend.com/audiences/${AUDIENCE_ID}/contacts`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ email, unsubscribed: true }),
    });
  }

  return NextResponse.json({ success: true });
}
