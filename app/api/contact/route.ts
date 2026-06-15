import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { company, email, message } = await req.json();

  if (process.env.RESEND_API_KEY) {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "NeuoTech Contact <digest@neurotech.com>",
        to: "alonbraun@me.com",
        subject: `NeuoTech advertise inquiry: ${company}`,
        html: `<p><strong>Company:</strong> ${company}</p><p><strong>Email:</strong> ${email}</p><p><strong>Message:</strong> ${message}</p>`,
      }),
    });
  }

  return NextResponse.json({ success: true });
}
