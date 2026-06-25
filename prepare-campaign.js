#!/usr/bin/env node
/**
 * Phase 1 — prepare-campaign.js
 * Reads Apollo CSVs, scores leads, creates listings on GitHub,
 * generates email bodies, queues them in pending-emails.json,
 * then triggers a Netlify deploy.
 *
 * Run: node prepare-campaign.js
 * Cron: 0 22 * * * cd ~/neurotech-hub && node prepare-campaign.js >> /tmp/prepare.log 2>&1
 */

const fs   = require("fs");
const path = require("path");
const https = require("https");

// ── Config ────────────────────────────────────────────────────────────────────
const ANTHROPIC_KEY    = process.env.ANTHROPIC_API_KEY;
const GITHUB_TOKEN     = process.env.GITHUB_TOKEN;
const NETLIFY_HOOK     = "https://api.netlify.com/build_hooks/6a2fb1891cc43f596e95e461";
const REPO             = "alonbraun/neurotech-hub";
const SITE_BASE        = "https://neurotech.com";
const CSV_FOLDER       = path.join(process.env.HOME, "Downloads");
const SENT_LOG         = path.join(__dirname, "content/campaigns/sent-leads.json");
const REJECTED_LOG     = path.join(__dirname, "content/campaigns/rejected-leads.json");
const PENDING_LOG      = path.join(__dirname, "content/campaigns/pending-emails.json");
const DELAY_MS         = 2000;
const MAX_PER_RUN      = 80; // max leads to queue per run

// ── Helpers ───────────────────────────────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function httpsPost(hostname, path, headers, body) {
  return new Promise((resolve, reject) => {
    const data = typeof body === "string" ? body : JSON.stringify(body);
    const req = https.request({ hostname, path, method: "POST", headers: { ...headers, "content-length": Buffer.byteLength(data) } }, res => {
      let b = ""; res.on("data", d => b += d); res.on("end", () => resolve(JSON.parse(b || "{}")));
    });
    req.on("error", reject); req.write(data); req.end();
  });
}

function httpsGet(hostname, p, headers) {
  return new Promise((resolve, reject) => {
    const req = https.request({ hostname, path: p, method: "GET", headers }, res => {
      let b = ""; res.on("data", d => b += d); res.on("end", () => resolve(JSON.parse(b || "{}")));
    });
    req.on("error", reject); req.end();
  });
}

function claudeCall(prompt, maxTokens = 600) {
  return httpsPost("api.anthropic.com", "/v1/messages",
    { "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    { model: "claude-haiku-4-5-20251001", max_tokens: maxTokens, messages: [{ role: "user", content: prompt }] }
  );
}

// ── CSV parser ────────────────────────────────────────────────────────────────
function parseCsvLine(line) {
  const cells = []; let cur = "", inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { if (inQuote && line[i+1] === '"') { cur += '"'; i++; } else inQuote = !inQuote; }
    else if (ch === "," && !inQuote) { cells.push(cur); cur = ""; }
    else cur += ch;
  }
  cells.push(cur); return cells;
}

function loadCsv(filePath) {
  const lines = fs.readFileSync(filePath, "utf8").split("\n").filter(Boolean);
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]).map(h => h.trim().toLowerCase().replace(/\s+/g, "_"));
  return lines.slice(1).map(line => {
    const vals = parseCsvLine(line);
    const row = {};
    headers.forEach((h, i) => row[h] = (vals[i] || "").trim());
    const firstName = row.first_name || "";
    const lastName  = row.last_name  || "";
    return {
      name:     row.name || row.full_name || (firstName || lastName ? `${firstName} ${lastName}`.trim() : ""),
      email:    (row.email || row.person_email || "").toLowerCase(),
      company:  row.company_name || row.company || "",
      title:    row.title || row.person_title || "",
      domain:   row.website || row.company_website_url || "",
      linkedin: row.person_linkedin_url || "",
      keywords: row.keywords || "",
    };
  }).filter(l => l.company && l.email && l.email.includes("@"));
}

// ── Dedup ─────────────────────────────────────────────────────────────────────
function normalizeCompany(name) { return name.toLowerCase().replace(/[^a-z0-9]/g, ""); }

function loadSet(filePath, field) {
  try { return new Set(JSON.parse(fs.readFileSync(filePath, "utf8")).map(e => (e[field] || "").toLowerCase())); }
  catch { return new Set(); }
}

// ── Relevance scoring ─────────────────────────────────────────────────────────
async function scoreRelevance(lead) {
  const res = await claudeCall(`You decide if a company should be listed on NeuroTech.com — a B2B directory for the neurotechnology industry.

Approved examples: Neuralink, Emotiv, Synchron, BrainBit, Nuro, Muse, Kernel, Blackrock Neurotech, Theranica, Noctrix Health
Rejected examples: VCCP (marketing agency), NHS Trust (hospital), Stanford University, general biotech, pharma sales companies

Company: "${lead.company}"
Domain: "${lead.domain}"
Title of contact: "${lead.title}"

Reply JSON only: {"score": 1-10, "reason": "one sentence", "verdict": "YES" | "NO"}
- YES (7-10): core neurotech — BCIs, neuromodulation, neurofeedback, brain diagnostics, cognitive health tech, mental health devices
- NO (1-6): hospitals, universities, general pharma, marketing agencies, unrelated tech`);
  try {
    let text = res.content[0].text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    return JSON.parse(text);
  } catch { return { score: 5, verdict: "NO", reason: "Parse error" }; }
}

// ── Publish listing to GitHub ─────────────────────────────────────────────────
async function publishListing(lead) {
  const slug = lead.company.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const descRes = await claudeCall(`Write a 2-sentence company description for a neurotech industry directory listing.
Company: ${lead.company}
Website: ${lead.domain}
Be factual and professional. No fluff. Return only the 2 sentences.`);
  const description = descRes.content[0].text.trim().replace(/\n/g, " ");
  const safeName = lead.company.includes(":") ? `"${lead.company}"` : lead.company;
  const content = `---
name: ${safeName}
slug: ${slug}
category: Neurotechnology
description: ${description}
website: ${lead.domain ? (lead.domain.startsWith("http") ? lead.domain : `https://${lead.domain}`) : ""}
funding: Private
location: ""
tier: free
featured: false
date: ${new Date().toISOString().split("T")[0]}
---
`;
  // Check if file exists
  const existing = await httpsGet("api.github.com",
    `/repos/${REPO}/contents/content/companies/${slug}.md`,
    { Authorization: `token ${GITHUB_TOKEN}`, "User-Agent": "neurotech/1.0" }
  ).catch(() => null);

  const payload = {
    message: `Add listing: ${lead.company}`,
    content: Buffer.from(content).toString("base64"),
  };
  if (existing && existing.sha) payload.sha = existing.sha;

  await httpsPost("api.github.com", `/repos/${REPO}/contents/content/companies/${slug}.md`,
    { Authorization: `token ${GITHUB_TOKEN}`, "User-Agent": "neurotech/1.0", "content-type": "application/json" },
    payload
  );
  return `${SITE_BASE}/directory/${slug}`;
}

// ── Generate email ────────────────────────────────────────────────────────────
async function generateEmail(lead, listingUrl) {
  const res = await claudeCall(`Write a short cold outreach email for NeuroTech.com, a neurotechnology industry portal.

Lead: ${lead.name || lead.company} — ${lead.title} at ${lead.company}
Their listing: ${listingUrl}

Rules:
- Subject line: specific, reference their company
- 3 short paragraphs max
- Mention their listing is live on NeuroTech.com (link it)
- Soft CTA: ask if they'd like to explore advertising (neurotech.com/advertise) — newsletter sponsorships, featured listings
- Do NOT mention audience numbers
- Sign: "Alon Braun\\nNeuroTech.com"
- Tone: founder-to-founder, warm, direct

Return JSON only: {"subject": "...", "body": "..."}`, 700);
  try {
    let text = res.content[0].text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    return JSON.parse(text);
  } catch { return null; }
}

// ── Trigger Netlify deploy ────────────────────────────────────────────────────
function triggerDeploy() {
  return new Promise((resolve) => {
    const url = new URL(NETLIFY_HOOK);
    const req = https.request({ hostname: url.hostname, path: url.pathname, method: "POST",
      headers: { "content-type": "application/json", "content-length": "2" }
    }, res => { resolve(res.statusCode); });
    req.on("error", () => resolve(null)); req.write("{}"); req.end();
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🚀 prepare-campaign.js — ${new Date().toLocaleString()}`);

  // Load all dedup sets
  const sentEmails     = loadSet(SENT_LOG, "email");
  const rejectedEmails = loadSet(REJECTED_LOG, "email");
  const pendingEmails  = loadSet(PENDING_LOG, "email");
  const sentCompanies  = loadSet(SENT_LOG, "company");
  const rejectedCompanies = loadSet(REJECTED_LOG, "company");
  const pendingCompanies  = loadSet(PENDING_LOG, "company");

  const skipEmails    = new Set([...sentEmails, ...rejectedEmails, ...pendingEmails]);
  const skipCompanies = new Set([...sentCompanies, ...rejectedCompanies, ...pendingCompanies]);

  // Load all CSVs
  const csvFiles = fs.readdirSync(CSV_FOLDER)
    .filter(f => f.match(/^apollo.*\.csv$/i))
    .map(f => path.join(CSV_FOLDER, f));

  let allLeads = [];
  for (const f of csvFiles) {
    try { allLeads.push(...loadCsv(f)); } catch(e) { console.log(`⚠ Could not read ${f}`); }
  }

  // Deduplicate
  const seen = new Set();
  const pending = [];
  let queued = 0, skipped = 0;

  for (const lead of allLeads) {
    if (queued >= MAX_PER_RUN) break;
    const emailLower = lead.email.toLowerCase();
    const compNorm   = normalizeCompany(lead.company);
    if (skipEmails.has(emailLower) || skipCompanies.has(compNorm) || seen.has(emailLower)) {
      skipped++; continue;
    }
    seen.add(emailLower);
    pending.push(lead);
  }

  console.log(`📋 ${allLeads.length} total leads — ${skipped} already processed — ${pending.length} to evaluate`);

  // Load existing pending queue
  let pendingQueue = [];
  try { pendingQueue = JSON.parse(fs.readFileSync(PENDING_LOG, "utf8")); } catch {}

  let added = 0, rejected = 0;
  const rejectedLog = [];
  try { rejectedLog.push(...JSON.parse(fs.readFileSync(REJECTED_LOG, "utf8"))); } catch {}

  for (const lead of pending) {
    if (added >= MAX_PER_RUN) break;
    process.stdout.write(`\n  ${lead.company} (${lead.email})\n`);

    // Score
    const score = await scoreRelevance(lead);
    process.stdout.write(`  ${score.verdict} (${score.score}/10) — ${score.reason}\n`);

    if (score.verdict === "NO") {
      rejectedLog.push({ email: lead.email, company: lead.company, rejected_at: new Date().toISOString() });
      fs.writeFileSync(REJECTED_LOG, JSON.stringify(rejectedLog, null, 2));
      rejected++; await sleep(DELAY_MS); continue;
    }

    // Publish listing
    process.stdout.write(`  Publishing listing...`);
    let listingUrl;
    try {
      listingUrl = await publishListing(lead);
      process.stdout.write(` ✅ ${listingUrl}\n`);
    } catch(e) {
      process.stdout.write(` ⚠ ${e.message}\n`);
      await sleep(DELAY_MS); continue;
    }

    // Generate email
    process.stdout.write(`  Generating email...`);
    const email = await generateEmail(lead, listingUrl);
    if (!email) { process.stdout.write(` ⚠ failed\n`); await sleep(DELAY_MS); continue; }
    process.stdout.write(` ✅ "${email.subject}"\n`);

    pendingQueue.push({
      email:      lead.email,
      name:       lead.name,
      company:    lead.company,
      title:      lead.title,
      subject:    email.subject,
      body:       email.body,
      listingUrl,
      queued_at:  new Date().toISOString(),
    });
    fs.writeFileSync(PENDING_LOG, JSON.stringify(pendingQueue, null, 2));
    added++;
    await sleep(DELAY_MS);
  }

  console.log(`\n✅ Queued: ${added} | Rejected: ${rejected}`);
  console.log(`📬 Total in pending queue: ${pendingQueue.length}`);

  if (added > 0) {
    process.stdout.write(`\n🔨 Triggering Netlify deploy...`);
    const status = await triggerDeploy();
    console.log(status === 201 ? " ✅ Deploy triggered" : ` ⚠ Status ${status}`);
    console.log(`⏳ Wait ~3 minutes for deploy to complete, then run: node send-pending.js`);
  } else {
    console.log(`\nNothing new to queue.`);
  }
}

main().catch(console.error);
