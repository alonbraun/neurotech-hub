#!/usr/bin/env node
/**
 * Phase 2 — send-pending.js
 * Sends emails from the pending queue (built by prepare-campaign.js).
 * Run AFTER the Netlify deploy completes (links are guaranteed live).
 *
 * Run: node send-pending.js
 * Cron: 0 8 * * * cd ~/neurotech-hub && node send-pending.js >> /tmp/send-pending.log 2>&1
 */

const fs   = require("fs");
const path = require("path");
const https = require("https");

// ── Config ────────────────────────────────────────────────────────────────────
const RESEND_KEY   = process.env.RESEND_API_KEY;
const FROM         = "Alon Braun <hello@neurotech.com>";
const QA_EMAIL     = "alon@riverbanks.com";
const PENDING_LOG  = path.join(__dirname, "content/campaigns/pending-emails.json");
const SENT_LOG     = path.join(__dirname, "content/campaigns/sent-leads.json");
const MAX_PER_RUN  = 80;   // stay under Resend 100/day limit
const DELAY_MS     = 3000;

const qaMode = process.argv.includes("--qa");

// ── Helpers ───────────────────────────────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function sendEmail(lead) {
  const to = qaMode ? QA_EMAIL : lead.email;
  const body = JSON.stringify({
    from: FROM, to, subject: lead.subject,
    text: lead.body,
  });
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: "api.resend.com", path: "/emails", method: "POST",
      headers: { Authorization: `Bearer ${RESEND_KEY}`, "content-type": "application/json", "content-length": Buffer.byteLength(body) }
    }, res => {
      let b = ""; res.on("data", d => b += d);
      res.on("end", () => resolve({ status: res.statusCode, body: JSON.parse(b || "{}") }));
    });
    req.on("error", reject); req.write(body); req.end();
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n📨 send-pending.js — ${new Date().toLocaleString()}${qaMode ? " [QA MODE]" : ""}`);

  let pending = [];
  try { pending = JSON.parse(fs.readFileSync(PENDING_LOG, "utf8")); } catch {
    console.log("No pending queue found. Run prepare-campaign.js first."); return;
  }

  let sentLog = [];
  try { sentLog = JSON.parse(fs.readFileSync(SENT_LOG, "utf8")); } catch {}

  const toSend = pending.slice(0, MAX_PER_RUN);
  const remaining = pending.slice(MAX_PER_RUN);

  console.log(`📋 ${pending.length} in queue — sending ${toSend.length} today — ${remaining.length} carry over`);

  let sent = 0, failed = 0;

  for (const lead of toSend) {
    process.stdout.write(`  → ${lead.company} <${qaMode ? QA_EMAIL : lead.email}>... `);
    try {
      const res = await sendEmail(lead);
      if (res.status === 200 || res.status === 201) {
        sentLog.push({
          email: lead.email, name: lead.name, company: lead.company,
          subject: lead.subject, listingUrl: lead.listingUrl,
          sent_at: new Date().toISOString(),
        });
        fs.writeFileSync(SENT_LOG, JSON.stringify(sentLog, null, 2));
        console.log("✅");
        sent++;
      } else {
        console.log(`⚠ ${res.status} — ${JSON.stringify(res.body)}`);
        failed++;
        // Put back in queue if failed
        remaining.unshift(lead);
      }
    } catch(e) {
      console.log(`❌ ${e.message}`);
      failed++;
      remaining.unshift(lead);
    }
    await sleep(DELAY_MS);
  }

  // Write back remaining queue
  fs.writeFileSync(PENDING_LOG, JSON.stringify(remaining, null, 2));

  console.log(`\n✅ Sent: ${sent} | Failed: ${failed} | Remaining in queue: ${remaining.length}`);
  if (remaining.length > 0) console.log(`   Run again tomorrow to send next batch.`);
}

main().catch(console.error);
