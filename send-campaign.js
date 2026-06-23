#!/usr/bin/env node
// Campaign sender — runs locally, no deploy needed
// Usage: node send-campaign.js [csv-path] [--qa]
// --qa mode: sends all emails to QA_EMAIL instead of real recipients
// Ctrl+C to stop safely at any time

const fs = require("fs");
const path = require("path");
const readline = require("readline");
const https = require("https");

// ─── Config (loaded from environment) ────────────────────────────────────────
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const RESEND_KEY    = process.env.RESEND_API_KEY;
const GITHUB_TOKEN  = process.env.GITHUB_TOKEN;
const REPO          = "alonbraun/neurotech-hub";
const FROM          = "Alon Braun <hello@neurotech.com>";
const QA_EMAIL      = "alon@riverbanks.com";
const DELAY_MS      = 3000;
const SENT_LOG_PATH     = path.join(__dirname, "content/campaigns/sent-leads.json");
const REJECTED_LOG_PATH = path.join(__dirname, "content/campaigns/rejected-leads.json");

const NEUROTECH_KEYWORDS = [
  "neuro", "brain", "neural", "bci", "cognitive", "neuroscience", "eeg", "tms",
  "neuropharma", "neurostim", "neurofeedback", "neurology", "synapse", "cortex",
  "psychiatry", "mental health tech", "mind", "spinal", "epilepsy", "parkinson",
  "alzheimer", "dementia", "stroke", "neurodegenerative", "implant", "electrode",
  "bioelectronic", "neuromodulation", "neurotechnology", "neuroprosthetic",
];

function isNeurotech(lead) {
  // Only check company name and domain — NOT Apollo keywords (those match why Apollo found them, not what they do)
  const domain = (lead.website || lead.email.split("@")[1] || "").toLowerCase();
  const text = `${lead.company} ${domain}`.toLowerCase();
  return NEUROTECH_KEYWORDS.some(k => text.includes(k));
}

const CSV_PATH = process.argv[2] || path.join(process.env.HOME, "Downloads/apollo-contacts-export-3.csv");
const QA_MODE  = process.argv.includes("--qa");

// ─── Helpers ──────────────────────────────────────────────────────────────────
function parseCsvLine(line) {
  const cells = [];
  let cur = "", inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuote = !inQuote;
    } else if (ch === "," && !inQuote) {
      cells.push(cur); cur = "";
    } else cur += ch;
  }
  cells.push(cur);
  return cells;
}

function loadCsv(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  const lines = text.trim().split("\n");
  const headers = parseCsvLine(lines[0]).map(h => h.trim().toLowerCase().replace(/\s+/g, "_"));
  return lines.slice(1).map(line => {
    const cells = parseCsvLine(line);
    const row = {};
    headers.forEach((h, i) => (row[h] = (cells[i] || "").trim()));
    const firstName = row.first_name || "";
    const lastName  = row.last_name  || "";
    return {
      name:      (firstName + " " + lastName).trim() || row.name || "",
      title:     row.title || row.job_title || "",
      company:   row.company_name || row.company || "",
      email:     row.email || "",
      linkedin:  row.person_linkedin_url || row.linkedin || "",
      relevance: row.keywords || "",
      website:   row.website || "",
    };
  }).filter(l => l.email && l.company);
}

function loadSentEmails() {
  try {
    const data = JSON.parse(fs.readFileSync(SENT_LOG_PATH, "utf8"));
    return new Set(data.map(e => e.email.toLowerCase()));
  } catch { return new Set(); }
}

function loadSentCompanies() {
  try {
    const data = JSON.parse(fs.readFileSync(SENT_LOG_PATH, "utf8"));
    return new Set(data.map(e => (e.name?.split(" ").slice(-1)[0] || "").toLowerCase())); // fallback
  } catch { return new Set(); }
}

function normalizeCompany(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function loadRejectedEmails() {
  try {
    const data = JSON.parse(fs.readFileSync(REJECTED_LOG_PATH, "utf8"));
    return new Set(data.map(e => e.email.toLowerCase()));
  } catch { return new Set(); }
}

function logRejected(lead) {
  let log = [];
  try { log = JSON.parse(fs.readFileSync(REJECTED_LOG_PATH, "utf8")); } catch {}
  log.push({ email: lead.email, company: lead.company, rejected_at: new Date().toISOString() });
  fs.mkdirSync(path.dirname(REJECTED_LOG_PATH), { recursive: true });
  fs.writeFileSync(REJECTED_LOG_PATH, JSON.stringify(log, null, 2));
}

function logSent(lead, subject) {
  let log = [];
  try { log = JSON.parse(fs.readFileSync(SENT_LOG_PATH, "utf8")); } catch {}
  log.push({
    email: lead.email,
    name: lead.name,
    company: lead.company,
    campaign: "NeuroTech.com — Sponsored Content Outreach June 2026",
    client: "NeuroTech.com",
    subject,
    sent_at: new Date().toISOString(),
  });
  fs.mkdirSync(path.dirname(SENT_LOG_PATH), { recursive: true });
  fs.writeFileSync(SENT_LOG_PATH, JSON.stringify(log, null, 2));
}

function fetchJson(url, options, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request({
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: options.method || "GET",
      headers: options.headers || {},
    }, res => {
      let data = "";
      res.on("data", chunk => (data += chunk));
      res.on("end", () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve({ raw: data }); }
      });
    });
    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function scoreRelevance(lead) {
  const prompt = `You are helping decide if a company should be listed on NeuroTech.com — a B2B industry directory for the neurotechnology sector.

NeuroTech.com covers: BCI (brain-computer interfaces), EEG/neurofeedback hardware and software, neuromodulation devices (TMS, tDCS, VNS, DBS), neural implants, neuroimaging, neurodiagnostics, cognitive health tech, digital therapeutics for neurological conditions, neuropharmaceuticals focused on brain, neuroscience research tools and platforms.

APPROVED in past (good fit): SciNeuro Pharmaceuticals, Precision Neuroscience, BrainSightAI, Mindway AI, emteq labs, Arctop, Wesper, Motion Informatics, Medicortex, CorrActions, Kandu, ViStim Labs, Mag4Health, Neurotechnology companies building devices/software/platforms.

REJECTED in past (bad fit): hospitals (RWJBarnabas, Sutter Health, Penn Medicine), universities (McGill, Northwestern, King's College), general CROs (TFS HealthScience, Worldwide Clinical Trials), marketing agencies (VCCP, Seedtag), edtech (Mindvalley, Seneca Learning), general health systems, general biotech not focused on brain/neuro, general pharma with no neuro focus.

Company to evaluate:
- Name: ${lead.company}
- Contact title: ${lead.title}
- Website: ${lead.website || lead.email.split("@")[1]}
- Keywords: ${lead.relevance ? lead.relevance.split(",").slice(0, 8).join(", ") : ""}

Reply with JSON only: {"score": 1-10, "reason": "one sentence", "verdict": "YES" | "MAYBE" | "NO"}
- YES (7-10): clearly neurotech — device, software, platform, or service directly for the brain/nervous system
- MAYBE (4-6): adjacent — could be relevant but not core neurotech
- NO (1-3): hospital, university, general health, edtech, unrelated industry`;

  try {
    const data = await fetchJson(
      "https://api.anthropic.com/v1/messages",
      {
        method: "POST",
        headers: {
          "x-api-key": ANTHROPIC_KEY,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
      },
      {
        model: "claude-haiku-4-5-20251001",
        max_tokens: 100,
        messages: [{ role: "user", content: prompt }],
      }
    );
    let text = data.content?.[0]?.text?.trim() || "{}";
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    return JSON.parse(text);
  } catch {
    return { score: 5, reason: "Could not score", verdict: "MAYBE" };
  }
}

async function publishCompany(lead) {
  const slug = lead.company.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const website = lead.website || `https://${lead.email.split("@")[1]}`;

  // Generate description via Claude
  const data = await fetchJson(
    "https://api.anthropic.com/v1/messages",
    {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
    },
    {
      model: "claude-haiku-4-5-20251001",
      max_tokens: 200,
      messages: [{
        role: "user",
        content: `Write a 2-sentence factual company description for a neurotech industry directory listing.
Company: ${lead.company}
Website: ${website}
Contact title: ${lead.title}
Keywords: ${lead.relevance ? lead.relevance.split(",").slice(0, 8).join(", ") : "neurotechnology"}

Return only the 2-sentence description, no other text.`,
      }],
    }
  );

  const description = data.content?.[0]?.text?.trim() || `${lead.company} is a neurotechnology company.`;

  const safeName = lead.company.includes(":") ? `"${lead.company}"` : lead.company;
  const content = `---
name: ${safeName}
slug: ${slug}
category: Neurotechnology
description: ${description}
website: ${website}
funding: Private
location: ""
tier: free
featured: false
date: ${new Date().toISOString().split("T")[0]}
---
`;

  const path = `content/companies/${slug}.md`;
  const b64 = Buffer.from(content).toString("base64");

  // Check if file already exists (need sha to update)
  let sha = undefined;
  try {
    const existing = await fetchJson(
      `https://api.github.com/repos/${REPO}/contents/${path}`,
      { headers: { Authorization: `token ${GITHUB_TOKEN}`, "User-Agent": "neurotech/1.0" } }
    );
    if (existing.sha) sha = existing.sha;
  } catch {}

  const body = { message: `Add ${lead.company} to directory`, content: b64 };
  if (sha) body.sha = sha;

  await fetchJson(
    `https://api.github.com/repos/${REPO}/contents/${path}`,
    {
      method: "PUT",
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        "User-Agent": "neurotech/1.0",
        "Content-Type": "application/json",
      },
    },
    body
  );

  return { slug, url: `https://neurotech.com/directory/${slug}`, description };
}

async function loadVoiceGuidelines() {
  if (!GITHUB_TOKEN) return "";
  try {
    const data = await fetchJson(
      `https://api.github.com/repos/${REPO}/contents/content/campaigns/voice-guidelines.md`,
      { headers: { Authorization: `token ${GITHUB_TOKEN}`, "User-Agent": "neurotech/1.0" } }
    );
    return Buffer.from(data.content, "base64").toString().trim();
  } catch { return ""; }
}

async function generateEmail(lead, voiceGuidelines, listingUrl) {
  const voiceContext = voiceGuidelines
    ? `\n\nVoice & style guidelines (always follow these):\n${voiceGuidelines}`
    : "";

  const listingContext = listingUrl
    ? `\nWe have just added ${lead.company} to the NeuroTech.com directory: ${listingUrl} — mention this naturally early in the email as the reason for reaching out. Let them know they now have a free listing and invite them to check it out.`
    : "";

  const prompt = `You write outreach emails for NeuroTech.com, a neurotechnology industry news and directory portal.

Campaign: Get marketing or communications leads at neurotech companies to advertise on NeuroTech.com
Sequence step: 1 — First touch — introduce NeuroTech.com and the advertising opportunity. Be curious, not salesy.
${listingContext}${voiceContext}

Lead:
- Name: ${lead.name}
- Title: ${lead.title}
- Company: ${lead.company}
- Why relevant: ${lead.relevance ? lead.relevance.split(",").slice(0, 5).join(", ") : "Neurotech industry professional"}

Write a personalized cold outreach email. Rules:
- Subject line: specific and intriguing, not generic
- Opening: reference the free directory listing we just created for them — that's the hook
- Body: 3-4 short paragraphs max
- Never mention specific audience size numbers
- Describe the audience qualitatively: "researchers, clinicians, founders, and investors in neurotechnology"
- After mentioning the free listing, mention we also have a job board at neurotech.com/jobs — briefly, one sentence
- Then softly introduce the paid advertising opportunity at neurotech.com/advertise
- Sign off as: "Alon Braun\\nNeuroTech.com"
- Tone: founder-to-founder, direct, warm, not corporate or templated

Return JSON: {"subject": "...", "body": "..."}
Return only valid JSON, no other text.`;

  const data = await fetchJson(
    "https://api.anthropic.com/v1/messages",
    {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
    },
    {
      model: "claude-haiku-4-5-20251001",
      max_tokens: 700,
      messages: [{ role: "user", content: prompt }],
    }
  );

  if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
  let text = data.content?.[0]?.text?.trim() || "{}";
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(text);
}

async function sendEmail(lead, subject, body, qaMode) {
  const toEmail = qaMode ? QA_EMAIL : lead.email;
  const toName  = qaMode ? `QA: ${lead.name}` : lead.name;

  const data = await fetchJson(
    "https://api.resend.com/emails",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_KEY}`,
        "Content-Type": "application/json",
      },
    },
    {
      from: FROM,
      to: [`${toName} <${toEmail}>`],
      subject: qaMode ? `[QA] ${subject}` : subject,
      text: body,
    }
  );

  if (data.statusCode >= 400 || data.name === "validation_error") {
    throw new Error(data.message || JSON.stringify(data));
  }
  return data.id;
}

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans.trim().toLowerCase()); }));
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  // Check env vars
  const missing = ["ANTHROPIC_API_KEY", "RESEND_API_KEY", "GITHUB_TOKEN"].filter(k => !process.env[k]);
  if (missing.length) {
    console.error(`❌ Missing env vars: ${missing.join(", ")}`);
    console.error(`   Run: export ANTHROPIC_API_KEY=... RESEND_API_KEY=... GITHUB_TOKEN=...`);
    process.exit(1);
  }

  console.log("\n🧠 NeuroTech.com Campaign Sender");
  console.log("─".repeat(50));
  if (QA_MODE) console.log(`⚠️  QA MODE — all emails go to ${QA_EMAIL}`);

  if (!fs.existsSync(CSV_PATH)) {
    console.error(`❌ CSV not found: ${CSV_PATH}`);
    process.exit(1);
  }

  const allLeads       = loadCsv(CSV_PATH);
  const sentEmails     = loadSentEmails();
  const rejectedEmails = loadRejectedEmails();

  // Build set of already-contacted company names (normalized)
  let sentCompanies = new Set();
  try {
    const data = JSON.parse(fs.readFileSync(SENT_LOG_PATH, "utf8"));
    data.forEach(e => { if (e.company) sentCompanies.add(normalizeCompany(e.company)); });
  } catch {}
  let rejectedCompanies = new Set();
  try {
    const data = JSON.parse(fs.readFileSync(REJECTED_LOG_PATH, "utf8"));
    data.forEach(e => { if (e.company) rejectedCompanies.add(normalizeCompany(e.company)); });
  } catch {}

  const pending = allLeads.filter(l => {
    const emailLower = l.email.toLowerCase();
    const companyNorm = normalizeCompany(l.company);
    return !sentEmails.has(emailLower) &&
           !rejectedEmails.has(emailLower) &&
           !sentCompanies.has(companyNorm) &&
           !rejectedCompanies.has(companyNorm);
  });

  console.log(`📋 Total in CSV:       ${allLeads.length}`);
  console.log(`✅ Already sent:        ${sentEmails.size} emails / ${sentCompanies.size} companies`);
  console.log(`🚫 Rejected:            ${rejectedCompanies.size} companies`);
  console.log(`📬 Pending to send:     ${pending.length}`);

  if (pending.length === 0) {
    console.log("\n✨ All contacts have been emailed already.");
    process.exit(0);
  }

  console.log("\nLoading voice guidelines...");
  const voiceGuidelines = await loadVoiceGuidelines();
  console.log(voiceGuidelines ? "✅ Voice guidelines loaded" : "⚠️  No voice guidelines, using defaults");
  console.log("\nPress Ctrl+C at any time to stop safely.\n");

  const start = await ask("Ready to start? (y/n): ");
  if (start !== "y") { console.log("Aborted."); process.exit(0); }

  const TARGET = 20;
  let sent = 0, skipped = 0, index = 0;

  while (index < pending.length && sent < TARGET) {
    const lead = pending[index++];

    console.log("\n" + "─".repeat(50));
    console.log(`👤 ${lead.name} — ${lead.title} @ ${lead.company}`);
    console.log(`📧 ${lead.email}`);

    // Score relevance
    process.stdout.write("   Scoring...");
    const score = await scoreRelevance(lead);
    const scoreEmoji = score.verdict === "YES" ? "✅" : score.verdict === "MAYBE" ? "🟡" : "❌";
    console.log(` ${scoreEmoji} ${score.verdict} (${score.score}/10) — ${score.reason}`);

    if (score.verdict === "NO" || score.verdict === "MAYBE") {
      console.log("   Skipping.");
      logRejected(lead);
      skipped++;
      continue;
    }

    // Publish listing
    process.stdout.write("   Publishing listing...");
    let listingUrl = null;
    try {
      const listing = await publishCompany(lead);
      listingUrl = listing.url;
      console.log(` ✅ ${listingUrl}`);
    } catch (err) {
      console.log(` ⚠️  ${err.message}`);
    }

    // Generate email
    process.stdout.write("   Generating email...");
    let subject, body;
    try {
      ({ subject, body } = await generateEmail(lead, voiceGuidelines, listingUrl));
      console.log(` ✅ "${subject}"`);
    } catch (err) {
      console.log(` ❌ ${err.message}`);
      skipped++;
      continue;
    }

    // Send
    process.stdout.write("   Sending...");
    try {
      await sendEmail(lead, subject, body, QA_MODE);
      if (!QA_MODE) logSent(lead, subject);
      sent++;
      console.log(` ✅ (${sent}/${TARGET})`);
    } catch (err) {
      console.log(` ❌ ${err.message}`);
      skipped++;
    }

    await sleep(DELAY_MS);
  }

  if (sent >= TARGET) {
    console.log(`\n${"═".repeat(50)}`);
    console.log(`🎯 Target reached: ${sent} emails sent. Run again for the next batch.`);
  }

  console.log("\n" + "═".repeat(50));
  console.log(`✨ Done! Sent: ${sent} | Skipped: ${skipped}`);
}

main().catch(err => {
  console.error("\n❌ Fatal error:", err.message);
  process.exit(1);
});
