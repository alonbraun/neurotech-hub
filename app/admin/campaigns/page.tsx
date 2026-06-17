"use client";

import { useState, useRef } from "react";

interface Lead {
  name: string;
  title: string;
  company: string;
  email: string;
  linkedin?: string;
  relevance?: string;
  // runtime state
  status?: "pending" | "generating" | "ready" | "sending" | "sent" | "error";
  subject?: string;
  body?: string;
  error?: string;
}

interface Campaign {
  name: string;
  client_company: string;
  client_description: string;
  campaign_goal: string;
  sequence_step: number;
}

function parseLeadsCsv(text: string): Lead[] {
  const lines = text.trim().split("\n");
  const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/\s+/g, "_"));
  return lines.slice(1).map(line => {
    const cells = line.split(",");
    const row: Record<string, string> = {};
    headers.forEach((h, i) => (row[h] = (cells[i] || "").trim()));
    return {
      name: row.name || row.full_name || "",
      title: row.title || row.job_title || "",
      company: row.company || row.organization || "",
      email: row.email || "",
      linkedin: row.linkedin || "",
      relevance: row.relevance || row.notes || "",
      status: "pending" as const,
    };
  }).filter(l => l.email);
}

export default function CampaignsPage() {
  const [campaign, setCampaign] = useState<Campaign>({
    name: "",
    client_company: "",
    client_description: "",
    campaign_goal: "",
    sequence_step: 1,
  });
  const [leads, setLeads] = useState<Lead[]>([]);
  const [generatingLeads, setGeneratingLeads] = useState(false);
  const [leadGenTarget, setLeadGenTarget] = useState("");
  const [leadGenCount, setLeadGenCount] = useState(20);
  const [activeTab, setActiveTab] = useState<"setup" | "leads" | "preview" | "send">("setup");
  const [sendProgress, setSendProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleCsvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const parsed = parseLeadsCsv(ev.target?.result as string);
      setLeads(parsed.map(l => ({ ...l, status: "pending" })));
    };
    reader.readAsText(file);
  }

  async function handleGenerateLeads() {
    if (!leadGenTarget || !campaign.client_company) return;
    setGeneratingLeads(true);
    try {
      const res = await fetch("/api/campaigns/generate-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company: campaign.client_company, target_description: leadGenTarget, count: leadGenCount }),
      });
      const json = await res.json();
      if (json.leads) setLeads(json.leads.map((l: Lead) => ({ ...l, status: "pending" })));
    } finally {
      setGeneratingLeads(false);
    }
  }

  async function generateEmailForLead(index: number) {
    const lead = leads[index];
    setLeads(l => l.map((x, i) => i === index ? { ...x, status: "generating" } : x));
    try {
      const res = await fetch("/api/campaigns/generate-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_company: campaign.client_company,
          client_description: campaign.client_description,
          campaign_goal: campaign.campaign_goal,
          lead,
          sequence_step: campaign.sequence_step,
        }),
      });
      const json = await res.json();
      setLeads(l => l.map((x, i) => i === index ? { ...x, status: "ready", subject: json.subject, body: json.body } : x));
    } catch (err: any) {
      setLeads(l => l.map((x, i) => i === index ? { ...x, status: "error", error: err.message } : x));
    }
  }

  async function generateAllEmails() {
    for (let i = 0; i < leads.length; i++) {
      if (leads[i].status === "pending") await generateEmailForLead(i);
    }
  }

  async function sendEmailForLead(index: number) {
    const lead = leads[index];
    if (!lead.subject || !lead.body) return;
    setLeads(l => l.map((x, i) => i === index ? { ...x, status: "sending" } : x));
    try {
      const res = await fetch("/api/campaigns/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaign_name: campaign.name,
          client_company: campaign.client_company,
          to_name: lead.name,
          to_email: lead.email,
          subject: lead.subject,
          body: lead.body,
        }),
      });
      const json = await res.json();
      setLeads(l => l.map((x, i) => i === index ? { ...x, status: json.success ? "sent" : "error", error: json.error } : x));
    } catch (err: any) {
      setLeads(l => l.map((x, i) => i === index ? { ...x, status: "error", error: err.message } : x));
    }
  }

  async function sendAll() {
    const ready = leads.filter(l => l.status === "ready");
    let sent = 0;
    for (let i = 0; i < leads.length; i++) {
      if (leads[i].status === "ready") {
        await sendEmailForLead(i);
        sent++;
        setSendProgress(Math.round((sent / ready.length) * 100));
        await new Promise(r => setTimeout(r, 500)); // rate limit
      }
    }
  }

  const readyCount = leads.filter(l => l.status === "ready").length;
  const sentCount = leads.filter(l => l.status === "sent").length;
  const pendingCount = leads.filter(l => l.status === "pending").length;
  const canProceedToLeads = campaign.name && campaign.client_company && campaign.campaign_goal;

  return (
    <div className="max-w-5xl mx-auto px-5 py-12">
      <div className="mb-8">
        <a href="/admin" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">← Admin dashboard</a>
        <div className="mt-3">
          <span className="text-xs font-semibold tracking-[3px] text-[#1a3d6b] uppercase">B2B Campaigns</span>
          <h1 className="text-3xl font-semibold text-gray-900 mt-1">Campaign Manager</h1>
          <p className="text-gray-500 mt-1 text-sm">Run targeted outreach campaigns on behalf of neurotech companies</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 bg-gray-100 rounded-xl p-1 w-fit">
        {(["setup", "leads", "preview", "send"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`text-sm font-medium px-4 py-2 rounded-lg capitalize transition-colors ${
              activeTab === tab ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-800"
            }`}
          >
            {tab === "leads" && leads.length > 0 ? `Leads (${leads.length})` : tab.charAt(0).toUpperCase() + tab.slice(1)}
            {tab === "preview" && readyCount > 0 ? ` (${readyCount})` : ""}
            {tab === "send" && sentCount > 0 ? ` (${sentCount} sent)` : ""}
          </button>
        ))}
      </div>

      {/* SETUP TAB */}
      {activeTab === "setup" && (
        <div className="bg-white border border-gray-100 rounded-2xl p-6 max-w-xl">
          <h2 className="text-sm font-semibold text-gray-900 mb-5">Campaign setup</h2>
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Campaign name</label>
              <input
                type="text"
                value={campaign.name}
                onChange={e => setCampaign(c => ({ ...c, name: e.target.value }))}
                placeholder="e.g. BrainTech Q3 Partnership Outreach"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1a3d6b]/20 focus:border-[#1a3d6b]"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Client company</label>
              <input
                type="text"
                value={campaign.client_company}
                onChange={e => setCampaign(c => ({ ...c, client_company: e.target.value }))}
                placeholder="e.g. NeuroLink Technologies"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1a3d6b]/20 focus:border-[#1a3d6b]"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">About the client (for email context)</label>
              <textarea
                value={campaign.client_description}
                onChange={e => setCampaign(c => ({ ...c, client_description: e.target.value }))}
                placeholder="e.g. NeuroLink develops non-invasive BCI headsets for cognitive enhancement in enterprise settings."
                rows={3}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1a3d6b]/20 focus:border-[#1a3d6b] resize-none"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Campaign goal</label>
              <textarea
                value={campaign.campaign_goal}
                onChange={e => setCampaign(c => ({ ...c, campaign_goal: e.target.value }))}
                placeholder="e.g. Book discovery calls with hospital neurology departments and research institutions to explore enterprise pilots."
                rows={2}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1a3d6b]/20 focus:border-[#1a3d6b] resize-none"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Sequence step</label>
              <select
                value={campaign.sequence_step}
                onChange={e => setCampaign(c => ({ ...c, sequence_step: Number(e.target.value) }))}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1a3d6b]/20 focus:border-[#1a3d6b]"
              >
                <option value={1}>Step 1 — First touch (introductory email)</option>
                <option value={2}>Step 2 — Follow-up (3 days, no reply)</option>
                <option value={3}>Step 3 — Final touch (7 days, no reply)</option>
              </select>
            </div>
            <button
              onClick={() => setActiveTab("leads")}
              disabled={!canProceedToLeads}
              className="mt-2 w-full text-sm font-semibold py-2.5 rounded-lg bg-[#1a3d6b] text-white hover:bg-[#152f54] disabled:opacity-40 transition-colors"
            >
              Continue to leads →
            </button>
          </div>
        </div>
      )}

      {/* LEADS TAB */}
      {activeTab === "leads" && (
        <div className="flex flex-col gap-6">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Upload CSV */}
            <div className="bg-white border border-gray-100 rounded-2xl p-6">
              <h2 className="text-sm font-semibold text-gray-900 mb-1">Upload leads (CSV)</h2>
              <p className="text-xs text-gray-400 mb-4">Columns: name, title, company, email, linkedin, relevance</p>
              <input ref={fileRef} type="file" accept=".csv" onChange={handleCsvUpload} className="hidden" />
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full text-sm font-medium py-2.5 rounded-lg border-2 border-dashed border-gray-200 text-gray-500 hover:border-[#1a3d6b] hover:text-[#1a3d6b] transition-colors"
              >
                Click to upload CSV
              </button>
            </div>

            {/* AI Generate */}
            <div className="bg-white border border-gray-100 rounded-2xl p-6">
              <h2 className="text-sm font-semibold text-gray-900 mb-1">AI-generate leads</h2>
              <p className="text-xs text-gray-400 mb-4">Describe your target audience and Claude will suggest leads</p>
              <textarea
                value={leadGenTarget}
                onChange={e => setLeadGenTarget(e.target.value)}
                placeholder="e.g. Heads of neurology at European university hospitals, neuroscience VCs, BCI startup founders"
                rows={2}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1a3d6b]/20 focus:border-[#1a3d6b] resize-none mb-3"
              />
              <div className="flex items-center gap-3">
                <select
                  value={leadGenCount}
                  onChange={e => setLeadGenCount(Number(e.target.value))}
                  className="text-sm border border-gray-200 rounded-lg px-3 py-2"
                >
                  {[10, 20, 30, 50].map(n => <option key={n} value={n}>{n} leads</option>)}
                </select>
                <button
                  onClick={handleGenerateLeads}
                  disabled={generatingLeads || !leadGenTarget || !campaign.client_company}
                  className="flex-1 flex items-center justify-center gap-2 text-sm font-medium py-2 rounded-lg bg-[#1a3d6b] text-white hover:bg-[#152f54] disabled:opacity-40 transition-colors"
                >
                  {generatingLeads ? (
                    <><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />Generating…</>
                  ) : "Generate leads"}
                </button>
              </div>
            </div>
          </div>

          {/* Leads table */}
          {leads.length > 0 && (
            <div className="bg-white border border-gray-100 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-gray-900">{leads.length} leads loaded</h2>
                <button
                  onClick={() => setActiveTab("preview")}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg bg-[#1a3d6b] text-white hover:bg-[#152f54] transition-colors"
                >
                  Next: generate emails →
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-gray-400 border-b border-gray-100">
                      <th className="pb-2 font-medium">Name</th>
                      <th className="pb-2 font-medium">Title / Company</th>
                      <th className="pb-2 font-medium">Email</th>
                      <th className="pb-2 font-medium">Relevance</th>
                      <th className="pb-2 font-medium">
                        <button onClick={() => setLeads(leads.filter((_, i) => true))} className="text-red-400 hover:text-red-600">Clear all</button>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map((lead, i) => (
                      <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50">
                        <td className="py-2 font-medium text-gray-800">{lead.name}</td>
                        <td className="py-2 text-gray-500">{lead.title}<br /><span className="text-gray-400">{lead.company}</span></td>
                        <td className="py-2 text-gray-500">{lead.email}</td>
                        <td className="py-2 text-gray-400 max-w-[200px] truncate">{lead.relevance}</td>
                        <td className="py-2">
                          <button
                            onClick={() => setLeads(leads.filter((_, j) => j !== i))}
                            className="text-gray-300 hover:text-red-500 transition-colors"
                          >✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* PREVIEW TAB */}
      {activeTab === "preview" && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{leads.length} leads · {readyCount} emails ready · {pendingCount} pending generation</p>
            </div>
            <button
              onClick={generateAllEmails}
              disabled={pendingCount === 0}
              className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg bg-[#1a3d6b] text-white hover:bg-[#152f54] disabled:opacity-40 transition-colors"
            >
              Generate all emails ({pendingCount})
            </button>
          </div>

          {leads.map((lead, i) => (
            <div key={i} className={`bg-white border rounded-xl overflow-hidden ${
              lead.status === "sent" ? "border-green-100" :
              lead.status === "ready" ? "border-blue-100" :
              lead.status === "error" ? "border-red-100" : "border-gray-100"
            }`}>
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{lead.name}</p>
                  <p className="text-xs text-gray-400">{lead.title} · {lead.company} · {lead.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  {lead.status === "pending" && (
                    <button
                      onClick={() => generateEmailForLead(i)}
                      className="text-xs font-medium px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                    >
                      Generate
                    </button>
                  )}
                  {lead.status === "generating" && (
                    <span className="text-xs text-gray-400 flex items-center gap-1.5">
                      <span className="w-3 h-3 border-2 border-gray-300 border-t-[#1a3d6b] rounded-full animate-spin" />Generating…
                    </span>
                  )}
                  {lead.status === "ready" && <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">Ready</span>}
                  {lead.status === "sent" && <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-700">Sent</span>}
                  {lead.status === "error" && <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-600">Error</span>}
                </div>
              </div>

              {(lead.status === "ready" || lead.status === "sending") && (
                <div className="px-4 pb-4 border-t border-gray-100">
                  <div className="mt-3">
                    <label className="text-xs font-medium text-gray-500 block mb-1">Subject</label>
                    <input
                      type="text"
                      value={lead.subject || ""}
                      onChange={e => setLeads(l => l.map((x, j) => j === i ? { ...x, subject: e.target.value } : x))}
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1a3d6b]/20 focus:border-[#1a3d6b]"
                    />
                  </div>
                  <div className="mt-3">
                    <label className="text-xs font-medium text-gray-500 block mb-1">Email body</label>
                    <textarea
                      value={lead.body || ""}
                      onChange={e => setLeads(l => l.map((x, j) => j === i ? { ...x, body: e.target.value } : x))}
                      rows={8}
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1a3d6b]/20 focus:border-[#1a3d6b] resize-y leading-relaxed"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}

          {readyCount > 0 && (
            <div className="sticky bottom-4">
              <button
                onClick={() => setActiveTab("send")}
                className="w-full text-sm font-semibold py-3 rounded-xl bg-[#1a3d6b] text-white hover:bg-[#152f54] shadow-lg transition-colors"
              >
                Review & send {readyCount} emails →
              </button>
            </div>
          )}
        </div>
      )}

      {/* SEND TAB */}
      {activeTab === "send" && (
        <div className="flex flex-col gap-6">
          <div className="bg-white border border-gray-100 rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-2">Ready to send</h2>
            <p className="text-sm text-gray-500 mb-5">
              {readyCount} emails will be sent from <strong>hello@neurotech.com</strong> on behalf of <strong>{campaign.client_company}</strong>.
              Each email includes an unsubscribe notice.
            </p>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 rounded-xl p-4 text-center">
                <p className="text-2xl font-semibold text-[#1a3d6b]">{leads.length}</p>
                <p className="text-xs text-gray-500 mt-0.5">Total leads</p>
              </div>
              <div className="bg-green-50 rounded-xl p-4 text-center">
                <p className="text-2xl font-semibold text-green-600">{sentCount}</p>
                <p className="text-xs text-gray-500 mt-0.5">Sent</p>
              </div>
              <div className="bg-amber-50 rounded-xl p-4 text-center">
                <p className="text-2xl font-semibold text-amber-600">{readyCount}</p>
                <p className="text-xs text-gray-500 mt-0.5">Ready to send</p>
              </div>
            </div>

            {sendProgress > 0 && sendProgress < 100 && (
              <div className="mb-4">
                <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                  <span>Sending…</span>
                  <span>{sendProgress}%</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#1a3d6b] rounded-full transition-all" style={{ width: `${sendProgress}%` }} />
                </div>
              </div>
            )}

            <button
              onClick={sendAll}
              disabled={readyCount === 0}
              className="w-full text-sm font-semibold py-3 rounded-xl bg-green-600 text-white hover:bg-green-700 disabled:opacity-40 transition-colors"
            >
              Send all {readyCount} emails now
            </button>
          </div>

          {/* Per-lead send status */}
          <div className="bg-white border border-gray-100 rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Send log</h2>
            <div className="flex flex-col gap-2">
              {leads.map((lead, i) => (
                <div key={i} className="flex items-center justify-between gap-3 py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-xs font-medium text-gray-800">{lead.name} <span className="text-gray-400 font-normal">· {lead.email}</span></p>
                    <p className="text-xs text-gray-400">{lead.subject}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {lead.status === "sent" && <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-700">Sent</span>}
                    {lead.status === "sending" && <span className="text-xs text-gray-400 flex items-center gap-1"><span className="w-3 h-3 border-2 border-gray-300 border-t-[#1a3d6b] rounded-full animate-spin" />Sending</span>}
                    {lead.status === "ready" && (
                      <button
                        onClick={() => sendEmailForLead(i)}
                        className="text-xs font-medium px-2.5 py-1 rounded-lg bg-[#1a3d6b] text-white hover:bg-[#152f54] transition-colors"
                      >
                        Send
                      </button>
                    )}
                    {lead.status === "error" && <span className="text-xs text-red-600">{lead.error || "Failed"}</span>}
                    {(lead.status === "pending" || lead.status === "generating") && (
                      <span className="text-xs text-gray-300">Not ready</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
