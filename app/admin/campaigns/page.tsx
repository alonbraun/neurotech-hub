"use client";

import { useState, useRef } from "react";

interface Lead {
  name: string;
  title: string;
  company: string;
  email: string;
  linkedin?: string;
  relevance?: string;
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

interface Article {
  title: string;
  excerpt: string;
  category: string;
  body: string;
}

interface ContentState {
  article_angle: string;
  article: Article | null;
  article_url: string;
  article_slug: string;
  article_published: boolean;
  linkedin_post: string;
  linkedin_queued: boolean;
  generating_article: boolean;
  publishing_article: boolean;
  generating_linkedin: boolean;
  queueing_linkedin: boolean;
  error: string;
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

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="text-xs font-medium px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
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
  const [leadGenError, setLeadGenError] = useState("");
  const [leadGenTarget, setLeadGenTarget] = useState("");
  const [leadGenCount, setLeadGenCount] = useState(20);
  const [previouslySent, setPreviouslySent] = useState<Set<string>>(new Set());
  const [invalidEmails, setInvalidEmails] = useState<Set<string>>(new Set());
  const [verifying, setVerifying] = useState(false);

  async function verifyEmails(leadList: Lead[]) {
    setVerifying(true);
    try {
      const res = await fetch("/api/campaigns/verify-emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails: leadList.map(l => l.email) }),
      });
      const json = await res.json();
      if (json.results) {
        const invalid = new Set<string>(
          json.results.filter((r: any) => !r.valid).map((r: any) => r.email.toLowerCase())
        );
        setInvalidEmails(invalid);
      }
    } finally {
      setVerifying(false);
    }
  }

  // Load previously contacted emails when entering leads tab
  async function loadSentLeads() {
    try {
      const res = await fetch("/api/campaigns/check-sent");
      const json = await res.json();
      if (json.emails) setPreviouslySent(new Set(json.emails));
    } catch {}
  }
  const [remarks, setRemarks] = useState<Record<string, string>>({});
  const [voiceGuidelines, setVoiceGuidelines] = useState("");
  const [savingVoice, setSavingVoice] = useState(false);
  const [voiceSaved, setVoiceSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<"setup" | "content" | "leads" | "preview" | "send">("setup");
  const [sendProgress, setSendProgress] = useState(0);
  const [content, setContent] = useState<ContentState>({
    article_angle: "",
    article: null,
    article_url: "",
    article_slug: "",
    article_published: false,
    linkedin_post: "",
    linkedin_queued: false,
    generating_article: false,
    publishing_article: false,
    generating_linkedin: false,
    queueing_linkedin: false,
    error: "",
  });
  const fileRef = useRef<HTMLInputElement>(null);

  function handleCsvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const parsed = parseLeadsCsv(ev.target?.result as string);
      const newLeads = parsed.map(l => ({ ...l, status: "pending" as const }));
      setLeads(newLeads);
      verifyEmails(newLeads);
    };
    reader.readAsText(file);
  }

  async function handleGenerateLeads() {
    if (!leadGenTarget || !campaign.client_company) return;
    setGeneratingLeads(true);
    setLeadGenError("");
    try {
      const res = await fetch("/api/campaigns/generate-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company: campaign.client_company, target_description: leadGenTarget, count: leadGenCount }),
      });
      const json = await res.json();
      if (json.error) setLeadGenError(json.error);
      else if (json.leads) {
        const newLeads = json.leads.map((l: Lead) => ({ ...l, status: "pending" as const }));
        setLeads(newLeads);
        verifyEmails(newLeads);
      }
      else setLeadGenError("No leads returned — try again.");
    } finally {
      setGeneratingLeads(false);
    }
  }

  async function handleGenerateArticle() {
    setContent(c => ({ ...c, generating_article: true, error: "" }));
    try {
      const res = await fetch("/api/campaigns/generate-article", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_company: campaign.client_company,
          client_description: campaign.client_description,
          campaign_goal: campaign.campaign_goal,
          article_angle: content.article_angle,
        }),
      });
      const json = await res.json();
      if (json.error) setContent(c => ({ ...c, error: json.error }));
      else setContent(c => ({ ...c, article: json }));
    } finally {
      setContent(c => ({ ...c, generating_article: false }));
    }
  }

  async function handlePublishArticle() {
    if (!content.article) return;
    setContent(c => ({ ...c, publishing_article: true, error: "" }));
    try {
      const res = await fetch("/api/campaigns/publish-article", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...content.article,
          client_company: campaign.client_company,
          campaign_name: campaign.name,
        }),
      });
      const json = await res.json();
      if (json.error) setContent(c => ({ ...c, error: json.error }));
      else setContent(c => ({ ...c, article_published: true, article_url: json.url, article_slug: json.slug }));
    } finally {
      setContent(c => ({ ...c, publishing_article: false }));
    }
  }

  async function handleGenerateLinkedIn() {
    if (!content.article_published) return;
    setContent(c => ({ ...c, generating_linkedin: true, error: "" }));
    try {
      const res = await fetch("/api/campaigns/queue-linkedin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_company: campaign.client_company,
          client_description: campaign.client_description,
          campaign_goal: campaign.campaign_goal,
          article_title: content.article?.title || "",
          article_url: content.article_url,
          campaign_name: campaign.name,
        }),
      });
      const json = await res.json();
      if (json.error) setContent(c => ({ ...c, error: json.error }));
      else setContent(c => ({ ...c, linkedin_post: json.post_text, linkedin_queued: true }));
    } finally {
      setContent(c => ({ ...c, generating_linkedin: false }));
    }
  }

  async function generateEmailForLead(index: number) {
    const lead = leads[index];
    const key = lead.email;
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
          article_url: content.article_url || undefined,
          article_title: content.article?.title || undefined,
          remarks: remarks[key] || undefined,
        }),
      });
      const json = await res.json();
      if (json.error) {
        setLeads(l => l.map((x, i) => i === index ? { ...x, status: "error", error: json.error } : x));
      } else {
        setLeads(l => l.map((x, i) => i === index ? { ...x, status: "ready", subject: json.subject, body: json.body } : x));
      }
    } catch (err: any) {
      setLeads(l => l.map((x, i) => i === index ? { ...x, status: "error", error: err.message } : x));
    }
  }

  async function saveVoiceGuidelines() {
    if (!voiceGuidelines.trim()) return;
    setSavingVoice(true);
    try {
      await fetch("/api/campaigns/save-voice-guidelines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guidelines: voiceGuidelines }),
      });
      setVoiceSaved(true);
      setTimeout(() => setVoiceSaved(false), 3000);
    } finally {
      setSavingVoice(false);
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
        await new Promise(r => setTimeout(r, 500));
      }
    }
  }

  const readyCount = leads.filter(l => l.status === "ready").length;
  const sentCount = leads.filter(l => l.status === "sent").length;
  const pendingCount = leads.filter(l => l.status === "pending").length;
  const canProceedToLeads = campaign.name && campaign.client_company && campaign.campaign_goal;

  const tabs = ["setup", "content", "leads", "preview", "send"] as const;

  return (
    <div className="max-w-5xl mx-auto px-5 py-12">
      <div className="mb-8">
        <a href="/admin" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">← Admin dashboard</a>
        <div className="mt-3">
          <span className="text-xs font-semibold tracking-[3px] text-[#1a3d6b] uppercase">B2B Campaigns</span>
          <h1 className="text-3xl font-semibold text-gray-900 mt-1">Campaign Manager</h1>
          <p className="text-gray-500 mt-1 text-sm">Sponsored article · Email outreach · LinkedIn feature — all in one campaign</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 bg-gray-100 rounded-xl p-1 w-fit flex-wrap">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`text-sm font-medium px-4 py-2 rounded-lg capitalize transition-colors ${
              activeTab === tab ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-800"
            }`}
          >
            {tab === "content" && content.article_published
              ? <span className="flex items-center gap-1.5">Content <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" /></span>
              : tab === "leads" && leads.length > 0 ? `Leads (${leads.length})`
              : tab === "preview" && readyCount > 0 ? `Preview (${readyCount})`
              : tab === "send" && sentCount > 0 ? `Send (${sentCount} sent)`
              : tab.charAt(0).toUpperCase() + tab.slice(1)}
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
              <input type="text" value={campaign.name} onChange={e => setCampaign(c => ({ ...c, name: e.target.value }))}
                placeholder="e.g. BrainTech Q3 Partnership Outreach"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1a3d6b]/20 focus:border-[#1a3d6b]" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Client company</label>
              <input type="text" value={campaign.client_company} onChange={e => setCampaign(c => ({ ...c, client_company: e.target.value }))}
                placeholder="e.g. NeuroLink Technologies"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1a3d6b]/20 focus:border-[#1a3d6b]" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">About the client</label>
              <textarea value={campaign.client_description} onChange={e => setCampaign(c => ({ ...c, client_description: e.target.value }))}
                placeholder="e.g. NeuroLink develops non-invasive BCI headsets for cognitive enhancement in enterprise settings."
                rows={3} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1a3d6b]/20 focus:border-[#1a3d6b] resize-none" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Campaign goal</label>
              <textarea value={campaign.campaign_goal} onChange={e => setCampaign(c => ({ ...c, campaign_goal: e.target.value }))}
                placeholder="e.g. Book discovery calls with hospital neurology departments and research institutions."
                rows={2} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1a3d6b]/20 focus:border-[#1a3d6b] resize-none" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Sequence step</label>
              <select value={campaign.sequence_step} onChange={e => setCampaign(c => ({ ...c, sequence_step: Number(e.target.value) }))}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1a3d6b]/20 focus:border-[#1a3d6b]">
                <option value={1}>Step 1 — First touch (introductory email)</option>
                <option value={2}>Step 2 — Follow-up (3 days, no reply)</option>
                <option value={3}>Step 3 — Final touch (7 days, no reply)</option>
              </select>
            </div>
            <button onClick={() => setActiveTab("content")} disabled={!canProceedToLeads}
              className="mt-2 w-full text-sm font-semibold py-2.5 rounded-lg bg-[#1a3d6b] text-white hover:bg-[#152f54] disabled:opacity-40 transition-colors">
              Continue: create campaign content →
            </button>
          </div>
        </div>
      )}

      {/* CONTENT TAB */}
      {activeTab === "content" && (
        <div className="flex flex-col gap-6">
          {/* Package summary */}
          <div className="bg-gradient-to-r from-[#1a3d6b]/5 to-[#5da8e0]/5 border border-[#1a3d6b]/10 rounded-2xl p-5">
            <p className="text-sm font-semibold text-[#1a3d6b] mb-2">Campaign content package for {campaign.client_company || "client"}</p>
            <div className="flex flex-wrap gap-3">
              {[
                { label: "Sponsored article on neurotech.com", done: content.article_published },
                { label: "LinkedIn post on NeuroTech.com page", done: content.linkedin_queued },
                { label: "Email outreach to leads (links to article)", done: false },
              ].map(item => (
                <div key={item.label} className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full ${item.done ? "bg-green-100 text-green-700" : "bg-white text-gray-500 border border-gray-200"}`}>
                  <span>{item.done ? "✓" : "○"}</span> {item.label}
                </div>
              ))}
            </div>
          </div>

          {/* Article section */}
          <div className="bg-white border border-gray-100 rounded-2xl p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Sponsored article</h2>
                <p className="text-xs text-gray-400 mt-0.5">Published on neurotech.com/news — linked in every outreach email</p>
              </div>
              {content.article_published && (
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-green-100 text-green-700">Published ✓</span>
              )}
            </div>

            {!content.article_published && (
              <div className="mb-4">
                <label className="text-xs font-medium text-gray-600 block mb-1">Article angle (optional)</label>
                <input type="text" value={content.article_angle}
                  onChange={e => setContent(c => ({ ...c, article_angle: e.target.value }))}
                  placeholder={`e.g. How ${campaign.client_company || "the company"} is changing clinical neurofeedback`}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1a3d6b]/20 focus:border-[#1a3d6b]" />
              </div>
            )}

            {content.article && (
              <div className="mb-4 border border-gray-100 rounded-xl p-4 bg-gray-50/50">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-sm font-semibold text-gray-900">{content.article.title}</p>
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full shrink-0">{content.article.category}</span>
                </div>
                <p className="text-xs text-gray-500 mb-3 italic">{content.article.excerpt}</p>
                <div className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto border-t border-gray-100 pt-3">
                  {content.article.body}
                </div>
                {content.article_published && content.article_url && (
                  <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                    <a href={content.article_url} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-[#1a3d6b] hover:underline">{content.article_url}</a>
                    <CopyButton text={content.article_url} />
                  </div>
                )}
              </div>
            )}

            {content.error && (
              <p className="text-xs text-red-600 mb-3">{content.error}</p>
            )}

            <div className="flex gap-2 flex-wrap">
              {!content.article_published && (
                <button onClick={handleGenerateArticle} disabled={content.generating_article || !campaign.client_company}
                  className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg bg-[#1a3d6b] text-white hover:bg-[#152f54] disabled:opacity-40 transition-colors">
                  {content.generating_article
                    ? <><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />Generating…</>
                    : content.article ? "Regenerate" : "Generate article"}
                </button>
              )}
              {content.article && !content.article_published && (
                <button onClick={handlePublishArticle} disabled={content.publishing_article}
                  className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-40 transition-colors">
                  {content.publishing_article
                    ? <><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />Publishing…</>
                    : "Publish to neurotech.com →"}
                </button>
              )}
            </div>
          </div>

          {/* LinkedIn section */}
          <div className="bg-white border border-gray-100 rounded-2xl p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">LinkedIn post — NeuroTech.com page</h2>
                <p className="text-xs text-gray-400 mt-0.5">Features {campaign.client_company || "the client"} · client can reshare from the neurotech.com page</p>
              </div>
              {content.linkedin_queued && (
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-100 text-blue-700">Queued ✓</span>
              )}
            </div>

            {!content.article_published && (
              <p className="text-xs text-gray-400 italic">Publish the article first — the LinkedIn post will link to it.</p>
            )}

            {content.article_published && !content.linkedin_queued && (
              <button onClick={handleGenerateLinkedIn} disabled={content.generating_linkedin}
                className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg bg-[#1a3d6b] text-white hover:bg-[#152f54] disabled:opacity-40 transition-colors">
                {content.generating_linkedin
                  ? <><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />Generating…</>
                  : "Generate & queue LinkedIn post"}
              </button>
            )}

            {content.linkedin_post && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Post copy</p>
                  <CopyButton text={content.linkedin_post} />
                </div>
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {content.linkedin_post}
                </div>
                {content.linkedin_queued && (
                  <p className="text-xs text-gray-400 mt-2">
                    Queued in <code className="bg-gray-100 px-1 rounded">content/linkedin-queue/</code> — the LinkedIn posting scheduled task will pick it up on next run (Mon/Wed/Fri 9:37am).
                    The client can reshare the post from the NeuroTech.com LinkedIn page.
                  </p>
                )}
              </div>
            )}
          </div>

          <button onClick={() => { setActiveTab("leads"); loadSentLeads(); }}
            className="w-full text-sm font-semibold py-2.5 rounded-xl bg-[#1a3d6b] text-white hover:bg-[#152f54] transition-colors">
            {content.article_published ? "Continue to leads →" : "Skip to leads (no article) →"}
          </button>
        </div>
      )}

      {/* LEADS TAB */}
      {activeTab === "leads" && (
        <div className="flex flex-col gap-6">
          {content.article_published && (
            <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-100 rounded-xl px-4 py-2">
              <span>✓</span> Article published — emails will include a link to it automatically.
            </div>
          )}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white border border-gray-100 rounded-2xl p-6">
              <h2 className="text-sm font-semibold text-gray-900 mb-1">Upload leads (CSV)</h2>
              <p className="text-xs text-gray-400 mb-4">Columns: name, title, company, email, linkedin, relevance</p>
              <input ref={fileRef} type="file" accept=".csv" onChange={handleCsvUpload} className="hidden" />
              <button onClick={() => fileRef.current?.click()}
                className="w-full text-sm font-medium py-2.5 rounded-lg border-2 border-dashed border-gray-200 text-gray-500 hover:border-[#1a3d6b] hover:text-[#1a3d6b] transition-colors">
                Click to upload CSV
              </button>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl p-6">
              <h2 className="text-sm font-semibold text-gray-900 mb-1">AI-generate leads</h2>
              <p className="text-xs text-gray-400 mb-4">Describe your target audience and Claude will suggest leads</p>
              <textarea value={leadGenTarget} onChange={e => setLeadGenTarget(e.target.value)}
                placeholder="e.g. Heads of neurology at European university hospitals, neuroscience VCs, BCI startup founders"
                rows={2} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1a3d6b]/20 focus:border-[#1a3d6b] resize-none mb-3" />
              <div className="flex items-center gap-3">
                <select value={leadGenCount} onChange={e => setLeadGenCount(Number(e.target.value))}
                  className="text-sm border border-gray-200 rounded-lg px-3 py-2">
                  {[10, 20, 30, 50].map(n => <option key={n} value={n}>{n} leads</option>)}
                </select>
                <button onClick={handleGenerateLeads} disabled={generatingLeads || !leadGenTarget || !campaign.client_company}
                  className="flex-1 flex items-center justify-center gap-2 text-sm font-medium py-2 rounded-lg bg-[#1a3d6b] text-white hover:bg-[#152f54] disabled:opacity-40 transition-colors">
                  {generatingLeads
                    ? <><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />Generating…</>
                    : "Generate leads"}
                </button>
              </div>
              {leadGenError && <p className="text-xs text-red-600 mt-2">{leadGenError}</p>}
            </div>
          </div>

          {leads.length > 0 && (
            <div className="bg-white border border-gray-100 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">
                    {leads.length} leads loaded
                    {verifying && <span className="ml-2 text-xs font-normal text-gray-400">Verifying emails…</span>}
                  </h2>
                  {!verifying && invalidEmails.size > 0 && (
                    <p className="text-xs text-red-600 mt-0.5">
                      ✕ {leads.filter(l => invalidEmails.has(l.email.toLowerCase())).length} invalid domains (will hard bounce) — remove before sending
                    </p>
                  )}
                  {!verifying && previouslySent.size > 0 && leads.filter(l => previouslySent.has(l.email.toLowerCase())).length > 0 && (
                    <p className="text-xs text-amber-600 mt-0.5">
                      ⚠ {leads.filter(l => previouslySent.has(l.email.toLowerCase())).length} already emailed in a previous campaign
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {leads.some(l => invalidEmails.has(l.email.toLowerCase())) && (
                    <button onClick={() => { setLeads(leads.filter(l => !invalidEmails.has(l.email.toLowerCase()))); setInvalidEmails(new Set()); }}
                      className="text-xs font-medium px-3 py-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition-colors">
                      Remove invalid ({leads.filter(l => invalidEmails.has(l.email.toLowerCase())).length})
                    </button>
                  )}
                  {leads.some(l => previouslySent.has(l.email.toLowerCase())) && (
                    <button onClick={() => setLeads(leads.filter(l => !previouslySent.has(l.email.toLowerCase())))}
                      className="text-xs font-medium px-3 py-1.5 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors">
                      Remove duplicates
                    </button>
                  )}
                  <button onClick={() => setActiveTab("preview")}
                    className="text-xs font-medium px-3 py-1.5 rounded-lg bg-[#1a3d6b] text-white hover:bg-[#152f54] transition-colors">
                    Next: generate emails →
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-gray-400 border-b border-gray-100">
                      <th className="pb-2 font-medium">Name</th>
                      <th className="pb-2 font-medium">Title / Company</th>
                      <th className="pb-2 font-medium">Email</th>
                      <th className="pb-2 font-medium">Relevance</th>
                      <th className="pb-2 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map((lead, i) => {
                      const alreadySent = previouslySent.has(lead.email.toLowerCase());
                      const isInvalid = invalidEmails.has(lead.email.toLowerCase());
                      return (
                      <tr key={i} className={`border-b border-gray-50 ${isInvalid ? "bg-red-50/50" : alreadySent ? "bg-amber-50/50" : "hover:bg-gray-50/50"}`}>
                        <td className="py-2 font-medium text-gray-800">
                          {lead.name}
                          {isInvalid && <span className="ml-1.5 text-red-500 text-[10px] font-semibold">invalid domain</span>}
                          {!isInvalid && alreadySent && <span className="ml-1.5 text-amber-600 text-[10px] font-semibold">already sent</span>}
                        </td>
                        <td className="py-2 text-gray-500">{lead.title}<br /><span className="text-gray-400">{lead.company}</span></td>
                        <td className="py-2 text-gray-500">{lead.email}</td>
                        <td className="py-2 text-gray-400 max-w-[200px] truncate">{lead.relevance}</td>
                        <td className="py-2">
                          <button onClick={() => setLeads(leads.filter((_, j) => j !== i))} className="text-gray-300 hover:text-red-500 transition-colors">✕</button>
                        </td>
                      </tr>
                      );
                    })}
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
            <p className="text-sm text-gray-600">{leads.length} leads · {readyCount} ready · {pendingCount} pending</p>
            <button onClick={generateAllEmails} disabled={pendingCount === 0}
              className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg bg-[#1a3d6b] text-white hover:bg-[#152f54] disabled:opacity-40 transition-colors">
              Generate all emails ({pendingCount})
            </button>
          </div>

          {/* Voice guidelines panel */}
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <p className="text-xs font-semibold text-amber-800">Voice & style guidelines</p>
                <p className="text-xs text-amber-600 mt-0.5">Saved permanently — applied to every future campaign email</p>
              </div>
              <button onClick={saveVoiceGuidelines} disabled={savingVoice || !voiceGuidelines.trim()}
                className="text-xs font-medium px-3 py-1.5 rounded-lg bg-amber-700 text-white hover:bg-amber-800 disabled:opacity-40 transition-colors shrink-0">
                {savingVoice ? "Saving…" : voiceSaved ? "Saved ✓" : "Save guidelines"}
              </button>
            </div>
            <textarea
              value={voiceGuidelines}
              onChange={e => setVoiceGuidelines(e.target.value)}
              placeholder={`e.g.\n- Never mention specific audience numbers\n- Always sign as Alon Braun\n- Tone: founder-to-founder, direct and warm\n- Don't use corporate language like "leverage" or "synergy"\n- Keep emails under 150 words`}
              rows={4}
              className="w-full text-xs border border-amber-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none"
            />
          </div>

          {leads.map((lead, i) => {
            const key = lead.email;
            return (
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
                  {(lead.status === "pending" || lead.status === "error") && (
                    <button onClick={() => generateEmailForLead(i)}
                      className="text-xs font-medium px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors">
                      Generate
                    </button>
                  )}
                  {lead.status === "generating" && (
                    <span className="text-xs text-gray-400 flex items-center gap-1.5">
                      <span className="w-3 h-3 border-2 border-gray-300 border-t-[#1a3d6b] rounded-full animate-spin" />Generating…
                    </span>
                  )}
                  {lead.status === "ready" && (
                    <>
                      <button onClick={() => generateEmailForLead(i)}
                        className="text-xs font-medium px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">
                        Regenerate
                      </button>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">Ready</span>
                    </>
                  )}
                  {lead.status === "sent" && <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-700">Sent</span>}
                </div>
              </div>

              {lead.status !== "sent" && (
                <div className="px-4 pb-4 border-t border-gray-100">
                  {/* Remarks for regeneration */}
                  <div className="mt-3">
                    <label className="text-xs font-medium text-gray-400 block mb-1">Remarks for (re)generation — optional</label>
                    <div className="flex gap-2">
                      <input type="text" value={remarks[key] || ""}
                        onChange={e => setRemarks(r => ({ ...r, [key]: e.target.value }))}
                        placeholder="e.g. make it shorter, focus on their clinical work, more casual"
                        className="flex-1 text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1a3d6b]/20 focus:border-[#1a3d6b]" />
                      {lead.status === "ready" && (
                        <button onClick={() => generateEmailForLead(i)}
                          className="text-xs font-medium px-3 py-1.5 rounded-lg bg-[#1a3d6b] text-white hover:bg-[#152f54] transition-colors whitespace-nowrap">
                          Regenerate ↺
                        </button>
                      )}
                    </div>
                  </div>
                  {(lead.status === "ready" || lead.status === "sending") && (<>
                    <div className="mt-3">
                      <label className="text-xs font-medium text-gray-500 block mb-1">Subject</label>
                      <input type="text" value={lead.subject || ""}
                        onChange={e => setLeads(l => l.map((x, j) => j === i ? { ...x, subject: e.target.value } : x))}
                        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1a3d6b]/20 focus:border-[#1a3d6b]" />
                    </div>
                    <div className="mt-3">
                      <label className="text-xs font-medium text-gray-500 block mb-1">Email body</label>
                      <textarea value={lead.body || ""}
                        onChange={e => setLeads(l => l.map((x, j) => j === i ? { ...x, body: e.target.value } : x))}
                        rows={8}
                        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1a3d6b]/20 focus:border-[#1a3d6b] resize-y leading-relaxed" />
                    </div>
                  </>)}
                  {lead.status === "error" && <p className="text-xs text-red-600 mt-2">{lead.error}</p>}
                </div>
              )}
            </div>
            );
          })}

          {readyCount > 0 && (
            <div className="sticky bottom-4">
              <button onClick={() => setActiveTab("send")}
                className="w-full text-sm font-semibold py-3 rounded-xl bg-[#1a3d6b] text-white hover:bg-[#152f54] shadow-lg transition-colors">
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
            <h2 className="text-sm font-semibold text-gray-900 mb-2">Campaign summary</h2>
            <div className="flex flex-wrap gap-3 mb-5">
              {content.article_published && (
                <div className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-green-50 text-green-700 border border-green-100">
                  ✓ Article published — <a href={content.article_url} target="_blank" rel="noopener noreferrer" className="underline">view</a>
                </div>
              )}
              {content.linkedin_queued && (
                <div className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                  ✓ LinkedIn post queued
                </div>
              )}
            </div>
            <p className="text-sm text-gray-500 mb-5">
              {readyCount} emails from <strong>hello@neurotech.com</strong> on behalf of <strong>{campaign.client_company}</strong>.
              {content.article_published && " Each email links to the sponsored article."}
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
                <p className="text-xs text-gray-500 mt-0.5">Ready</p>
              </div>
            </div>

            {sendProgress > 0 && sendProgress < 100 && (
              <div className="mb-4">
                <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                  <span>Sending…</span><span>{sendProgress}%</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#1a3d6b] rounded-full transition-all" style={{ width: `${sendProgress}%` }} />
                </div>
              </div>
            )}

            <button onClick={sendAll} disabled={readyCount === 0}
              className="w-full text-sm font-semibold py-3 rounded-xl bg-green-600 text-white hover:bg-green-700 disabled:opacity-40 transition-colors">
              Send all {readyCount} emails now
            </button>
          </div>

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
                      <button onClick={() => sendEmailForLead(i)}
                        className="text-xs font-medium px-2.5 py-1 rounded-lg bg-[#1a3d6b] text-white hover:bg-[#152f54] transition-colors">
                        Send
                      </button>
                    )}
                    {lead.status === "error" && <span className="text-xs text-red-600">{lead.error || "Failed"}</span>}
                    {(lead.status === "pending" || lead.status === "generating") && <span className="text-xs text-gray-300">Not ready</span>}
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
