import { NextResponse } from "next/server";

const IMAP_HOST = "imap.zoho.eu";
const IMAP_PORT = 993;
const EMAIL = "hello@neurotech.com";
const PASSWORD = process.env.ZOHO_APP_PASSWORD || "NPjPFLD9naSM";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "";
const REPO = "alonbraun/neurotech-hub";

function extractAddr(str: string): string {
  const m = str.match(/[\w.+-]+@[\w.-]+\.\w+/);
  return m ? m[0].toLowerCase() : str.toLowerCase();
}

async function saveToGithub(data: object) {
  if (!GITHUB_TOKEN) return;
  const path = "content/inbox/latest.json";
  const content = Buffer.from(JSON.stringify(data, null, 2)).toString("base64");
  const apiUrl = `https://api.github.com/repos/${REPO}/contents/${path}`;
  const headers = {
    Authorization: `token ${GITHUB_TOKEN}`,
    "Content-Type": "application/json",
    "User-Agent": "neurotech/1.0",
  };
  let sha: string | undefined;
  try {
    const res = await fetch(apiUrl, { headers });
    if (res.ok) sha = (await res.json()).sha;
  } catch {}
  const body: Record<string, string> = { message: `Inbox update ${new Date().toISOString().split("T")[0]}`, content };
  if (sha) body.sha = sha;
  await fetch(apiUrl, { method: "PUT", headers, body: JSON.stringify(body) });
}

export async function POST() {
  try {
    // Dynamic import so build doesn't fail if imapflow not yet installed
    const { ImapFlow } = await import("imapflow");

    const client = new ImapFlow({
      host: IMAP_HOST,
      port: IMAP_PORT,
      secure: true,
      auth: { user: EMAIL, pass: PASSWORD },
      logger: false,
    });

    await client.connect();

    // Fetch from INBOX
    const inboxMsgs: any[] = [];
    await client.mailboxOpen("INBOX");
    for await (const msg of client.fetch("1:*", { envelope: true, bodyStructure: true, source: true })) {
      const source = msg.source?.toString() || "";
      const body = source.replace(/^[\s\S]*?\r?\n\r?\n/, "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 800);
      inboxMsgs.push({
        uid: msg.uid,
        folder: "INBOX",
        from: msg.envelope?.from?.[0]?.address || "",
        from_name: msg.envelope?.from?.[0]?.name || "",
        to: msg.envelope?.to?.[0]?.address || "",
        subject: msg.envelope?.subject || "",
        date: msg.envelope?.date?.toISOString() || "",
        body,
        message_id: msg.envelope?.messageId || "",
      });
    }

    // Fetch from Sent (try multiple folder names Zoho may use)
    const sentMsgs: any[] = [];
    try {
      let sentFolder = "Sent";
      try { await client.mailboxOpen("Sent"); }
      catch { await client.mailboxOpen("Sent Items"); sentFolder = "Sent Items"; }
      for await (const msg of client.fetch("1:*", { envelope: true, source: true })) {
        const source = msg.source?.toString() || "";
        const body = source.replace(/^[\s\S]*?\r?\n\r?\n/, "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 800);
        sentMsgs.push({
          uid: msg.uid,
          folder: "Sent",
          from: msg.envelope?.from?.[0]?.address || EMAIL,
          to: msg.envelope?.to?.[0]?.address || "",
          subject: msg.envelope?.subject || "",
          date: msg.envelope?.date?.toISOString() || "",
          body,
          message_id: msg.envelope?.messageId || "",
        });
      }
    } catch {}

    await client.logout();

    const allMsgs = [...inboxMsgs, ...sentMsgs];

    // Find unread (newest inbox messages not matched with a sent reply)
    const unread: any[] = [];
    const sentAddrs = new Set(sentMsgs.map(m => extractAddr(m.to)));

    // Group by contact address for thread building
    const threadMap: Record<string, any[]> = {};
    for (const m of allMsgs) {
      const addr = m.folder === "INBOX" ? extractAddr(m.from) : extractAddr(m.to);
      if (!threadMap[addr]) threadMap[addr] = [];
      threadMap[addr].push(m);
    }

    // Inbox messages sorted newest first — check if we sent a reply AFTER them
    const inboxSorted = [...inboxMsgs].sort((a, b) => b.date.localeCompare(a.date));
    const seen = new Set<string>();
    for (const msg of inboxSorted) {
      const addr = extractAddr(msg.from);
      if (seen.has(addr)) continue;
      seen.add(addr);
      // Check if we have a sent email to this address AFTER this message
      const sentAfter = sentMsgs.filter(s => extractAddr(s.to) === addr && s.date > msg.date);
      const thread = (threadMap[addr] || []).sort((a: any, b: any) => a.date.localeCompare(b.date));
      unread.push({
        from: msg.from_name ? `${msg.from_name} <${msg.from}>` : msg.from,
        from_addr: addr,
        subject: msg.subject,
        date: msg.date,
        body: msg.body,
        message_id: msg.message_id,
        needs_reply: sentAfter.length === 0,
        thread_length: thread.length,
        thread: thread.map((t: any) => ({
          folder: t.folder,
          from: t.from,
          to: t.to,
          subject: t.subject,
          date: t.date,
          body: t.body.slice(0, 600),
        })),
      });
    }

    const result = {
      updated_at: new Date().toISOString(),
      unread_count: unread.filter(e => e.needs_reply).length,
      unread,
      recent: inboxSorted.slice(0, 20).map(m => ({
        from: m.from_name ? `${m.from_name} <${m.from}>` : m.from,
        subject: m.subject,
        date: m.date,
        preview: m.body.slice(0, 150),
        unread: false,
      })),
    };

    await saveToGithub(result);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
