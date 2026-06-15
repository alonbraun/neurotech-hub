import { NextRequest, NextResponse } from "next/server";

const AUDIENCE_ID = process.env.NEUROTECH_AUDIENCE_ID || "";

export async function POST(req: NextRequest) {
  const { email, firstName } = await req.json();
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });
  if (!process.env.RESEND_API_KEY || !AUDIENCE_ID) return NextResponse.json({ success: true });

  await fetch(`https://api.resend.com/audiences/${AUDIENCE_ID}/contacts`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email, first_name: firstName || "", unsubscribed: false }),
  });

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "NeuoTech Digest <digest@neurotech.com>",
      to: email,
      subject: "You're subscribed to the NeuoTech Digest",
      html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#1a1a1a">
  <h2 style="color:#1a3d6b;margin:0 0 12px">Welcome to the NeuoTech Digest</h2>
  <p style="color:#444;line-height:1.6">You're now subscribed. Every Sunday you'll receive curated news, funding rounds, and job opportunities from the neurotechnology industry.</p>
  <p style="color:#444;line-height:1.6">The next issue lands this Sunday.</p>
  <p style="margin-top:32px"><a href="https://neurotech.com" style="background:#1a3d6b;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:14px">Visit NeuoTech.com</a></p>
  <hr style="margin:32px 0;border:none;border-top:1px solid #eee">
  <p style="font-size:12px;color:#999">You're receiving this because you subscribed at neurotech.com.<br>
  <a href="https://neurotech.com/unsubscribe?email=${encodeURIComponent(email)}" style="color:#999">Unsubscribe</a></p>
</div>`,
    }),
  });

  return NextResponse.json({ success: true });
}
