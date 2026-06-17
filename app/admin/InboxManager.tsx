"use client";

import { useState } from "react";

interface ThreadMsg {
  folder: string;
  from: string;
  to: string;
  subject: string;
  date: string;
  body: string;
}

interface InboxEmail {
  from: string;
  from_addr: string;
  subject: string;
  date: string;
  body: string;
  message_id: string;
  needs_reply: boolean;
  thread_length: number;
  thread: ThreadMsg[];
  suggested_reply?: string;
}

interface InboxData {
  updated_at: string | null;
  unread_count: number;
  unread: InboxEmail[];
  recent: any[];
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  return `${mins}m ago`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function InboxManager({ initialData }: { initialData: InboxData }) {
  const [data, setData] = useState<InboxData>(initialData);
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [filter, setFilter] = useState<"needs_reply" | "all">("needs_reply");

  // Per-email state
  const [replies, setReplies] = useState<Record<string, string>>({});
  const [generating, setGenerating] = useState<Record<string, boolean>>({});
  const [sending, setSending] = useState<Record<string, boolean>>({});
  const [sent, setSent] = useState<Record<string, boolean>>({});
  const [sendErrors, setSendErrors] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [showThread, setShowThread] = useState<Record<string, boolean>>({});

  async function handleFetch() {
    setFetching(true);
    setFetchError("");
    try {
      const res = await fetch("/api/inbox/fetch", { method: "POST" });
      const json = await res.json();
      if (json.error) { setFetchError(json.error); return; }
      setData(json);
    } catch (e: any) {
      setFetchError(e.message);
    } finally {
      setFetching(false);
    }
  }

  async function handleGenerate(email: InboxEmail) {
    const key = email.from_addr;
    setGenerating(g => ({ ...g, [key]: true }));
    try {
      const res = await fetch("/api/inbox/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, thread: email.thread }),
      });
      const json = await res.json();
      if (json.reply) setReplies(r => ({ ...r, [key]: json.reply }));
    } finally {
      setGenerating(g => ({ ...g, [key]: false }));
    }
  }

  async function handleSend(email: InboxEmail) {
    const key = email.from_addr;
    const body = replies[key];
    if (!body?.trim()) return;
    setSending(s => ({ ...s, [key]: true }));
    setSendErrors(e => ({ ...e, [key]: "" }));
    try {
      const res = await fetch("/api/inbox/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: email.from_addr,
          subject: email.subject,
          body,
          in_reply_to: email.message_id,
        }),
      });
      const json = await res.json();
      if (json.error) {
        setSendErrors(e => ({ ...e, [key]: json.error }));
      } else {
        setSent(s => ({ ...s, [key]: true }));
        // Mark as replied in local state
        setData(d => ({
          ...d,
          unread: d.unread.map(e => e.from_addr === key ? { ...e, needs_reply: false } : e),
        }));
      }
    } finally {
      setSending(s => ({ ...s, [key]: false }));
    }
  }

  const displayed = filter === "needs_reply"
    ? data.unread.filter(e => e.needs_reply)
    : data.unread;

  const needsReplyCount = data.unread.filter(e => e.needs_reply).length;

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-6 mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-gray-900">Inbox — hello@neurotech.com</h2>
          {needsReplyCount > 0 && (
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-500 text-white">{needsReplyCount} need reply</span>
          )}
          {data.unread.length > needsReplyCount && (
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">{data.unread.length - needsReplyCount} replied</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {data.updated_at && (
            <span className="text-xs text-gray-400">Updated {timeAgo(data.updated_at)}</span>
          )}
          <button
            onClick={handleFetch}
            disabled={fetching}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-[#1a3d6b] text-white hover:bg-[#152f54] disabled:opacity-50 transition-colors"
          >
            {fetching ? (
              <>
                <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
                Fetching…
              </>
            ) : "Refresh inbox"}
          </button>
        </div>
      </div>

      {fetchError && (
        <div className="mb-4 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {fetchError.includes("imapflow") || fetchError.includes("Cannot find module")
            ? "imapflow not installed yet — run `npm install imapflow` in /tmp/neurotech-hub then redeploy."
            : fetchError}
        </div>
      )}

      {/* Filter tabs */}
      {data.unread.length > 0 && (
        <div className="flex gap-2 mb-4 border-b border-gray-100 pb-3">
          <button
            onClick={() => setFilter("needs_reply")}
            className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${filter === "needs_reply" ? "bg-red-50 text-red-700" : "text-gray-500 hover:text-gray-800"}`}
          >
            Needs reply ({needsReplyCount})
          </button>
          <button
            onClick={() => setFilter("all")}
            className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${filter === "all" ? "bg-gray-100 text-gray-800" : "text-gray-500 hover:text-gray-800"}`}
          >
            All inbound ({data.unread.length})
          </button>
        </div>
      )}

      {/* Email list */}
      {displayed.length === 0 ? (
        <p className="text-sm text-gray-400">
          {fetching ? "Fetching…" : data.updated_at ? "No emails need a reply." : 'Click "Refresh inbox" to fetch emails.'}
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {displayed.map((email) => {
            const key = email.from_addr;
            const isExpanded = expanded[key] ?? email.needs_reply;
            const hasDraft = !!replies[key];
            const isSent = sent[key];

            return (
              <div
                key={key}
                className={`border rounded-xl overflow-hidden transition-colors ${
                  isSent ? "border-green-100 bg-green-50/20" :
                  email.needs_reply ? "border-red-100 bg-red-50/10" : "border-gray-100"
                }`}
              >
                {/* Email header row */}
                <button
                  onClick={() => setExpanded(e => ({ ...e, [key]: !isExpanded }))}
                  className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-gray-50/50"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {isSent && <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">Sent</span>}
                      {!isSent && email.needs_reply && <span className="w-2 h-2 rounded-full bg-red-500 shrink-0 inline-block" />}
                      <span className={`text-sm font-semibold ${isSent ? "text-gray-500" : "text-gray-900"} truncate`}>{email.subject || "(no subject)"}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{email.from} · {formatDate(email.date)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {email.thread_length > 1 && (
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{email.thread_length} msgs</span>
                    )}
                    <span className="text-xs text-gray-400">{isExpanded ? "▲" : "▼"}</span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-gray-100">
                    {/* Email body */}
                    <div className="mt-3 bg-white border border-gray-100 rounded-lg p-3 text-xs text-gray-700 leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
                      {email.body || "(empty)"}
                    </div>

                    {/* Thread history toggle */}
                    {email.thread_length > 1 && (
                      <button
                        onClick={() => setShowThread(t => ({ ...t, [key]: !t[key] }))}
                        className="mt-2 text-xs text-[#1a3d6b] hover:underline"
                      >
                        {showThread[key] ? "Hide thread history" : `Show thread history (${email.thread_length} messages)`}
                      </button>
                    )}
                    {showThread[key] && (
                      <div className="mt-2 flex flex-col gap-2">
                        {email.thread.map((m, i) => (
                          <div key={i} className={`text-xs rounded-lg p-2.5 border ${m.folder === "Sent" ? "bg-blue-50/40 border-blue-100 ml-4" : "bg-gray-50 border-gray-100"}`}>
                            <p className="font-medium text-gray-600 mb-1">
                              {m.folder === "Sent" ? "→ You" : `← ${m.from}`} · {m.date?.slice(0, 10)}
                            </p>
                            <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{m.body?.slice(0, 300)}{m.body?.length > 300 ? "…" : ""}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Reply compose area */}
                    {!isSent && email.needs_reply && (
                      <div className="mt-4">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Reply</p>
                          <button
                            onClick={() => handleGenerate(email)}
                            disabled={generating[key]}
                            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-[#1a3d6b] text-white hover:bg-[#152f54] disabled:opacity-50 transition-colors"
                          >
                            {generating[key] ? (
                              <>
                                <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
                                Generating…
                              </>
                            ) : hasDraft ? "Regenerate" : "Generate reply"}
                          </button>
                        </div>
                        <textarea
                          value={replies[key] || ""}
                          onChange={e => setReplies(r => ({ ...r, [key]: e.target.value }))}
                          placeholder="Generate a reply above or type manually…"
                          rows={6}
                          className="w-full text-sm text-gray-800 border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-[#1a3d6b]/20 focus:border-[#1a3d6b] resize-y leading-relaxed"
                        />
                        {sendErrors[key] && (
                          <p className="mt-1 text-xs text-red-600">{sendErrors[key]}</p>
                        )}
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-xs text-gray-400">To: {email.from_addr} · From: hello@neurotech.com</p>
                          <button
                            onClick={() => handleSend(email)}
                            disabled={sending[key] || !replies[key]?.trim()}
                            className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-40 transition-colors"
                          >
                            {sending[key] ? (
                              <>
                                <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
                                Sending…
                              </>
                            ) : "Approve & send"}
                          </button>
                        </div>
                      </div>
                    )}

                    {isSent && (
                      <div className="mt-3 text-xs text-green-700 bg-green-50 rounded-lg px-3 py-2 border border-green-100">
                        Reply sent successfully.
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
