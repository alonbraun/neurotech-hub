export const dynamic = "force-dynamic";

import { getAllFiles } from "@/lib/content";

const AUDIENCE_ID = process.env.NEUROTECH_AUDIENCE_ID || "";
const GITHUB_REPO = "alonbraun/neurotech-hub";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "";
const RESEND_KEY = process.env.RESEND_API_KEY || "";

async function getSubscribers() {
  if (!RESEND_KEY || !AUDIENCE_ID) return { count: 0, recent: [] };
  try {
    const res = await fetch(`https://api.resend.com/audiences/${AUDIENCE_ID}/contacts`, {
      headers: { Authorization: `Bearer ${RESEND_KEY}` }, next: { revalidate: 300 },
    });
    const data = await res.json();
    const active = (data.data || []).filter((c: any) => !c.unsubscribed);
    return { count: active.length, recent: active.slice(-5).reverse().map((c: any) => ({ email: c.email, created: c.created_at })) };
  } catch { return { count: 0, recent: [] }; }
}

async function getAgentRuns() {
  if (!GITHUB_TOKEN) return [];
  try {
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/actions/runs?per_page=20`, {
      headers: { Authorization: `token ${GITHUB_TOKEN}`, Accept: "application/vnd.github.v3+json" }, next: { revalidate: 120 },
    });
    const data = await res.json();
    return (data.workflow_runs || []).map((r: any) => ({ id: r.id, name: r.name, status: r.status, conclusion: r.conclusion, created_at: r.created_at, html_url: r.html_url }));
  } catch { return []; }
}

async function getGithubFile(path: string) {
  if (!GITHUB_TOKEN) return null;
  try {
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${path}`, {
      headers: { Authorization: `token ${GITHUB_TOKEN}`, Accept: "application/vnd.github.v3.raw" },
      next: { revalidate: 120 },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch { return null; }
}

function parseCsv(text: string) {
  const lines = text.trim().split("\n");
  const headers = lines[0].split(",");
  return lines.slice(1).map((line) => {
    const cells = line.split(",");
    const row: Record<string, string> = {};
    headers.forEach((h, i) => (row[h.trim()] = (cells[i] || "").trim()));
    return row;
  });
}

async function getOutreachStats() {
  const csv = await getGithubFile("scripts/leads.csv");
  if (!csv) return { total: 0, emailsFound: 0, contacted: 0, replied: 0, remaining: 0, recent: [] as any[] };
  const rows = parseCsv(csv);
  const emailsFound = rows.filter((r) => r.email).length;
  const contacted = rows.filter((r) => r.contacted === "yes").length;
  const replied = rows.filter((r) => r.replied && r.replied !== "").length;
  const remaining = rows.filter((r) => r.email && r.contacted !== "yes").length;
  const recent = rows.filter((r) => r.contacted === "yes" && r.contact_date)
    .sort((a, b) => (a.contact_date < b.contact_date ? 1 : -1)).slice(0, 6);
  return { total: rows.length, emailsFound, contacted, replied, remaining, recent };
}

async function getLinkedInStats() {
  const json = await getGithubFile("content/news/.linkedin-posted.json");
  const posted: string[] = json ? (JSON.parse(json).posted || []) : [];
  return { posted };
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000); const hours = Math.floor(mins / 60); const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`; if (hours > 0) return `${hours}h ago`; return `${mins}m ago`;
}

function StatusBadge({ conclusion, status }: { conclusion: string | null; status: string }) {
  if (status === "in_progress") return <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-blue-50 text-blue-700"><span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse inline-block" />Running</span>;
  if (conclusion === "success") return <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-green-50 text-green-700"><span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />Success</span>;
  if (conclusion === "failure") return <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-red-50 text-red-700"><span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />Failed</span>;
  return <span className="text-xs text-gray-400 px-2.5 py-1 rounded-full bg-gray-50">{conclusion || status}</span>;
}

export default async function AdminPage() {
  const [subscribers, runs, outreach, linkedin] = await Promise.all([getSubscribers(), getAgentRuns(), getOutreachStats(), getLinkedInStats()]);
  const companies = getAllFiles("companies") as any[];
  const news = getAllFiles("news") as any[];
  const jobs = getAllFiles("jobs") as any[];
  const linkedinRemaining = news.filter((n: any) => !linkedin.posted.includes(n.slug) && !n.sponsored).length;
  const agentRuns = runs.filter((r: any) => r.name !== "Deploy to Netlify");
  const deployRuns = runs.filter((r: any) => r.name === "Deploy to Netlify");
  const lastDeploy = deployRuns[0];
  const agentSummary = ["NeuroTech News Agent", "NeuroTech Directory Agent", "NeuroTech Newsletter Agent"].map(name => ({ name, last: agentRuns.find((r: any) => r.name === name) }));

  return (
    <div className="max-w-5xl mx-auto px-5 py-12">
      <div className="mb-10">
        <span className="text-xs font-semibold tracking-[3px] text-[#1a3d6b] uppercase">Portal Admin</span>
        <h1 className="text-3xl font-semibold text-gray-900 mt-2">Dashboard</h1>
        <p className="text-gray-500 mt-1 text-sm">Live stats for NeuroTech.com</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {[
          { label: "Subscribers", value: subscribers.count, sub: "active", color: "text-[#1a3d6b]" },
          { label: "Companies", value: companies.length, sub: "listed", color: "text-blue-600" },
          { label: "Articles", value: news.length, sub: "published", color: "text-purple-600" },
          { label: "Jobs", value: jobs.length, sub: "active", color: "text-amber-600" },
        ].map(({ label, value, sub, color }) => (
          <div key={label} className="bg-white border border-gray-100 rounded-2xl p-5">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</p>
            <p className={`text-4xl font-semibold mt-2 ${color}`}>{value}</p>
            <p className="text-xs text-gray-400 mt-1">{sub}</p>
          </div>
        ))}
      </div>
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white border border-gray-100 rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-5">Agent status</h2>
          <div className="flex flex-col gap-4">
            {agentSummary.map(({ name, last }) => (
              <div key={name} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{name.replace(" Agent", "")}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{last ? timeAgo(last.created_at) : "Never run"}</p>
                </div>
                {last ? <a href={last.html_url} target="_blank" rel="noopener noreferrer"><StatusBadge conclusion={last.conclusion} status={last.status} /></a>
                  : <span className="text-xs text-gray-300 bg-gray-50 px-2.5 py-1 rounded-full">No runs</span>}
              </div>
            ))}
            {lastDeploy && (
              <div className="flex items-center justify-between gap-3 pt-3 border-t border-gray-50">
                <div><p className="text-sm font-medium text-gray-800">Last deploy</p><p className="text-xs text-gray-400 mt-0.5">{timeAgo(lastDeploy.created_at)}</p></div>
                <a href={lastDeploy.html_url} target="_blank" rel="noopener noreferrer"><StatusBadge conclusion={lastDeploy.conclusion} status={lastDeploy.status} /></a>
              </div>
            )}
          </div>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-5">Recent agent runs</h2>
          <div className="flex flex-col gap-3">
            {agentRuns.slice(0, 6).map((r: any) => (
              <a key={r.id} href={r.html_url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-2 hover:bg-gray-50 -mx-2 px-2 py-1 rounded-lg transition-colors">
                <div className="min-w-0"><p className="text-xs font-medium text-gray-800 truncate">{r.name}</p><p className="text-xs text-gray-400">{timeAgo(r.created_at)}</p></div>
                <StatusBadge conclusion={r.conclusion} status={r.status} />
              </a>
            ))}
            {agentRuns.length === 0 && <p className="text-sm text-gray-400">No runs yet.</p>}
          </div>
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-100 rounded-2xl p-6">
          <div className="flex items-baseline justify-between mb-5">
            <h2 className="text-sm font-semibold text-gray-900">Recent articles</h2>
            <a href="/news" className="text-xs text-[#1a3d6b] hover:underline">View site →</a>
          </div>
          <div className="flex flex-col gap-3">
            {news.slice(0, 5).map((n: any) => (
              <div key={n.slug} className="flex items-start gap-3">
                <span className="mt-0.5 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 shrink-0">{n.category || "News"}</span>
                <div className="min-w-0"><p className="text-xs font-medium text-gray-800 leading-snug line-clamp-2">{n.title}</p><p className="text-xs text-gray-400 mt-0.5">{n.date}</p></div>
              </div>
            ))}
            {news.length === 0 && <p className="text-sm text-gray-400">No articles yet.</p>}
          </div>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-6">
          <div className="flex items-baseline justify-between mb-5">
            <h2 className="text-sm font-semibold text-gray-900">Recent subscribers</h2>
            <span className="text-xs text-gray-400">{subscribers.count} total</span>
          </div>
          {subscribers.recent.length > 0 ? (
            <div className="flex flex-col gap-3">
              {subscribers.recent.map((s: any) => (
                <div key={s.email} className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-gray-800 truncate">{s.email}</p>
                  {s.created && <p className="text-xs text-gray-400 shrink-0">{timeAgo(s.created)}</p>}
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-gray-400">No subscribers yet.</p>}
          <div className="mt-6 pt-5 border-t border-gray-50">
            <p className="text-xs text-gray-400 mb-3 font-medium uppercase tracking-wide">Quick links</p>
            <div className="flex flex-col gap-2">
              <a href="https://github.com/alonbraun/neurotech-hub/actions" target="_blank" rel="noopener noreferrer" className="text-xs text-gray-600 hover:text-[#1a3d6b] transition-colors">→ All GitHub Actions runs</a>
              <a href="https://resend.com/audiences" target="_blank" rel="noopener noreferrer" className="text-xs text-gray-600 hover:text-[#1a3d6b] transition-colors">→ Manage subscribers in Resend</a>
              <a href="https://app.netlify.com" target="_blank" rel="noopener noreferrer" className="text-xs text-gray-600 hover:text-[#1a3d6b] transition-colors">→ Netlify site settings</a>
            </div>
          </div>
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-6 mt-6">
        <div className="bg-white border border-gray-100 rounded-2xl p-6">
          <div className="flex items-baseline justify-between mb-5">
            <h2 className="text-sm font-semibold text-gray-900">Sales outreach</h2>
            <span className="text-xs text-gray-400">{outreach.emailsFound} leads with email</span>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div>
              <p className="text-2xl font-semibold text-[#1a3d6b]">{outreach.contacted}</p>
              <p className="text-xs text-gray-400 mt-0.5">Contacted</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-green-600">{outreach.replied}</p>
              <p className="text-xs text-gray-400 mt-0.5">Replied</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-amber-600">{outreach.remaining}</p>
              <p className="text-xs text-gray-400 mt-0.5">Remaining</p>
            </div>
          </div>
          <div className="flex flex-col gap-2.5 pt-4 border-t border-gray-50">
            {outreach.recent.length > 0 ? outreach.recent.map((r: any) => (
              <div key={r.slug} className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-gray-800 truncate">{r.name}</p>
                <span className="text-xs text-gray-400 shrink-0">{r.contact_date}</span>
              </div>
            )) : <p className="text-xs text-gray-400">No outreach sent yet.</p>}
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-6">
          <div className="flex items-baseline justify-between mb-5">
            <h2 className="text-sm font-semibold text-gray-900">LinkedIn posting</h2>
            <a href="https://buffer.com" target="_blank" rel="noopener noreferrer" className="text-xs text-[#1a3d6b] hover:underline">Open Buffer →</a>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div>
              <p className="text-2xl font-semibold text-[#1a3d6b]">{linkedin.posted.length}</p>
              <p className="text-xs text-gray-400 mt-0.5">Posted</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-amber-600">{linkedinRemaining}</p>
              <p className="text-xs text-gray-400 mt-0.5">Backlog remaining</p>
            </div>
          </div>
          <div className="flex flex-col gap-2.5 pt-4 border-t border-gray-50">
            {news.slice(0, 6).map((n: any) => {
              const isPosted = linkedin.posted.includes(n.slug);
              return (
                <div key={n.slug} className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-gray-800 truncate">{n.title}</p>
                  <span className={`text-xs shrink-0 px-2 py-0.5 rounded-full ${isPosted ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-400"}`}>
                    {isPosted ? "Posted" : "Pending"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <p className="mt-8 text-xs text-center text-gray-300">Stats refresh every 2–5 minutes · <a href="/" className="hover:text-gray-500">← Back to site</a></p>
    </div>
  );
}
