import { NextResponse } from "next/server";

const RESEND_KEY = process.env.RESEND_API_KEY || "";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "";
const REPO = "alonbraun/neurotech-hub";
const FROM = "NeuroTech.com Team <hello@neurotech.com>";

async function logSentToGithub(to: string, subject: string) {
  if (!GITHUB_TOKEN) return;
  const path = "content/inbox/sent-log.json";
  const apiUrl = `https://api.github.com/repos/${REPO}/contents/${path}`;
  const headers = {
    Authorization: `token ${GITHUB_TOKEN}`,
    "Content-Type": "application/json",
    "User-Agent": "neurotech/1.0",
  };

  let existing: any[] = [];
  let sha: string | undefined;
  try {
    const res = await fetch(apiUrl, { headers });
    if (res.ok) {
      const file = await res.json();
      sha = file.sha;
      existing = JSON.parse(Buffer.from(file.content, "base64").toString());
    }
  } catch {}

  const addr = (to.match(/[\w.+-]+@[\w.-]+\.\w+/) || [to])[0].toLowerCase();
  existing.push({ to: addr, subject, sent_at: new Date().toISOString() });

  const content = Buffer.from(JSON.stringify(existing, null, 2)).toString("base64");
  const body: Record<string, string> = {
    message: `inbox: log reply to ${addr}`,
    content,
  };
  if (sha) body.sha = sha;
  await fetch(apiUrl, { method: "PUT", headers, body: JSON.stringify(body) }).catch(() => {});
}

export async function POST(req: Request) {
  const { to, subject, body, in_reply_to } = await req.json();

  if (!to || !subject || !body) {
    return NextResponse.json({ error: "Missing to, subject, or body" }, { status: 400 });
  }

  const replySubject = subject.startsWith("Re:") ? subject : `Re: ${subject}`;

  const emailHeaders: Record<string, string> = {};
  if (in_reply_to) {
    emailHeaders["In-Reply-To"] = in_reply_to;
    emailHeaders["References"] = in_reply_to;
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
        headers: emailHeaders,
      }),
    });
    const data = await res.json();
    if (!res.ok) return NextResponse.json({ error: data.message || "Send failed" }, { status: 500 });

    // Log the sent reply so inbox fetch can mark it as replied
    await logSentToGithub(to, replySubject);

    return NextResponse.json({ success: true, id: data.id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
