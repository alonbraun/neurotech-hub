#!/usr/bin/env python3
"""
Step 3: Send follow-up emails to companies contacted 5+ days ago with no reply.
One follow-up only — then marks as done.
"""

import os, csv, json, datetime, urllib.request, time, random, shutil

RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "re_MA4BSqhJ_HeBKRzoa6mHT77oABnsKBkAh")
FROM_EMAIL     = "listings@neurotech.com"
FROM_NAME      = "NeuroTech.com"
SITE_URL       = "https://neurotech.com"
LEADS_CSV      = os.path.join(os.path.dirname(__file__), "leads.csv")
FOLLOWUP_DAYS  = 5
MAX_PER_RUN    = 20

def followup_html(name, category, slug):
    listing_url = f"{SITE_URL}/directory/{slug}"
    return f"""
<div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1a1a2e;line-height:1.6">
  <p>Hi {name} team,</p>
  <p>Just a quick follow-up on my note from last week.</p>
  <p>
    {name} has a free listing on <a href="{listing_url}" style="color:#1a3d6b">NeuroTech.com</a>.
    We have a limited number of <strong>Featured spots</strong> open at <strong>$199/month</strong>
    — priority placement, featured badge, newsletter inclusion, and a full company profile.
  </p>
  <p>If this isn't for you, no worries at all — just reply and I'll stop reaching out.</p>
  <p>
    <a href="mailto:{FROM_EMAIL}?subject=Featured listing — {name}"
       style="display:inline-block;background:#1a3d6b;color:#fff;padding:10px 22px;border-radius:8px;text-decoration:none;font-weight:600">
      Claim featured listing →
    </a>
  </p>
  <p style="color:#999;font-size:12px;border-top:1px solid #eee;padding-top:12px;margin-top:24px">
    NeuroTech.com · To unsubscribe, reply with "unsubscribe".
  </p>
</div>
"""

def send_email(to_email, name, category, slug):
    payload = json.dumps({
        "from": f"{FROM_NAME} <{FROM_EMAIL}>",
        "to": [to_email],
        "subject": f"Following up — {name}'s featured listing on NeuroTech.com",
        "html": followup_html(name, category, slug),
    }).encode()
    req = urllib.request.Request(
        "https://api.resend.com/emails",
        data=payload,
        headers={"Authorization": f"Bearer {RESEND_API_KEY}", "Content-Type": "application/json", "User-Agent": "neurotech-outreach/1.0"},
        method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return resp.status == 200
    except urllib.error.HTTPError as e:
        print(f"    HTTP {e.code}: {e.read().decode()}")
        return False

def main():
    rows = list(csv.DictReader(open(LEADS_CSV)))
    today = datetime.date.today()
    cutoff = today - datetime.timedelta(days=FOLLOWUP_DAYS)

    # Companies: contacted, no reply, not yet followed up, contacted 5+ days ago
    to_followup = [
        r for r in rows
        if r["contacted"] == "yes"
        and r["replied"] == ""
        and r.get("followup_sent", "") == ""
        and r["contact_date"]
        and datetime.date.fromisoformat(r["contact_date"]) <= cutoff
    ]

    print(f"{len(to_followup)} companies eligible for follow-up\n")
    sent = 0

    for row in to_followup:
        if sent >= MAX_PER_RUN:
            break
        print(f"  Following up: {row['name']} <{row['email']}>...", end=" ", flush=True)
        ok = send_email(row["email"], row["name"], row["category"], row["slug"])
        if ok:
            row["followup_sent"] = today.isoformat()
            print("✓")
            sent += 1
        else:
            print("✗ failed")
        time.sleep(random.uniform(1.5, 3.0))

    tmp = LEADS_CSV + ".tmp"
    fieldnames = rows[0].keys() if rows else []
    with open(tmp, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=list(fieldnames) + (["followup_sent"] if "followup_sent" not in fieldnames else []))
        writer.writeheader()
        writer.writerows(rows)
    shutil.move(tmp, LEADS_CSV)
    print(f"\nDone. {sent} follow-ups sent.")

if __name__ == "__main__":
    main()
