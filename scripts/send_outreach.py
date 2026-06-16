#!/usr/bin/env python3
"""
Step 2: Send personalised cold emails to companies found in leads.csv.
Sends via Resend. Updates leads.csv with contact_date.
Run again after 5 days to send follow-ups.
"""

import os, csv, json, datetime, urllib.request, urllib.parse, time, random, tempfile, shutil

RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "re_MA4BSqhJ_HeBKRzoa6mHT77oABnsKBkAh")
FROM_EMAIL     = "listings@neurotech.com"
FROM_NAME      = "NeuroTech.com"
SITE_URL       = "https://neurotech.com"
PRICE          = "$199/month"
LEADS_CSV      = os.path.join(os.path.dirname(__file__), "leads.csv")

# Safety: max emails per run to avoid hitting Resend limits
MAX_PER_RUN = 20

def email_subject(name):
    return f"{name} is listed on NeuroTech.com — claim your featured profile"

def email_body_html(name, category, slug):
    listing_url = f"{SITE_URL}/directory/{slug}"
    return f"""
<div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1a1a2e;line-height:1.6">
  <p>Hi {name} team,</p>

  <p>
    I wanted to let you know that <strong>{name}</strong> is currently listed in the
    <a href="{listing_url}" style="color:#1a3d6b">{category}</a> section of
    <a href="{SITE_URL}" style="color:#1a3d6b">NeuroTech.com</a> — one of the web's most
    comprehensive neurotechnology directories, tracking 200+ companies across BCIs,
    cognitive health, neuromodulation, psychedelics, and more.
  </p>

  <p>
    We're offering a small number of <strong>Featured Listings</strong> at <strong>{PRICE}</strong>,
    which includes:
  </p>
  <ul style="padding-left:20px">
    <li>Priority placement at the top of your category</li>
    <li>Featured badge visible across the site</li>
    <li>Extended company profile with logo, funding details, and full description</li>
    <li>Inclusion in our weekly newsletter (sent to neurotech professionals)</li>
  </ul>

  <p>
    NeuroTech.com has been the home of the neurotech community since 2020, when we ran
    one of the world's first dedicated neurotech conferences with speakers from
    King's College London, Apollo Neuroscience, Intheon, and more.
  </p>

  <p>
    <a href="mailto:{FROM_EMAIL}?subject=Featured listing — {name}"
       style="display:inline-block;background:#1a3d6b;color:#fff;padding:10px 22px;border-radius:8px;text-decoration:none;font-weight:600">
      Reply to claim your featured listing →
    </a>
  </p>

  <p style="color:#666;font-size:13px">
    You can view your current listing here:<br>
    <a href="{listing_url}" style="color:#1a3d6b">{listing_url}</a>
  </p>

  <p style="color:#999;font-size:12px;border-top:1px solid #eee;padding-top:12px;margin-top:24px">
    NeuroTech.com · The Neurotechnology Industry Hub<br>
    To unsubscribe from listing notifications, reply with "unsubscribe".
  </p>
</div>
"""

def email_body_text(name, category, slug):
    listing_url = f"{SITE_URL}/directory/{slug}"
    return f"""Hi {name} team,

{name} is listed in the {category} section of NeuroTech.com — one of the web's most comprehensive neurotechnology directories, tracking 200+ companies.

We're offering Featured Listings at {PRICE}, which includes:
- Priority placement at the top of your category
- Featured badge across the site
- Extended company profile with logo and full description
- Inclusion in our weekly newsletter

View your current listing: {listing_url}

Reply to this email to claim your featured listing.

NeuroTech.com — The Neurotechnology Industry Hub
To unsubscribe, reply with "unsubscribe".
"""

def send_email(to_email, name, category, slug):
    payload = json.dumps({
        "from": f"{FROM_NAME} <{FROM_EMAIL}>",
        "to": [to_email],
        "subject": email_subject(name),
        "html": email_body_html(name, category, slug),
        "text": email_body_text(name, category, slug),
    }).encode()

    req = urllib.request.Request(
        "https://api.resend.com/emails",
        data=payload,
        headers={
            "Authorization": f"Bearer {RESEND_API_KEY}",
            "Content-Type": "application/json",
            "User-Agent": "neurotech-outreach/1.0",
        },
        method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return resp.status == 200
    except urllib.error.HTTPError as e:
        print(f"    HTTP {e.code}: {e.read().decode()}")
        return False

def main():
    if not os.path.exists(LEADS_CSV):
        print("leads.csv not found. Run find_emails.py first.")
        return

    rows = list(csv.DictReader(open(LEADS_CSV)))
    today = datetime.date.today().isoformat()

    # Find candidates: has email, not yet contacted
    to_send = [r for r in rows if r["email"] and r["contacted"] == "no"]
    print(f"{len(to_send)} companies ready to contact (capped at {MAX_PER_RUN} per run)\n")

    sent = 0
    for row in to_send:
        if sent >= MAX_PER_RUN:
            break

        name     = row["name"]
        email    = row["email"]
        category = row["category"]
        slug     = row["slug"]

        print(f"  Sending to {name} <{email}>...", end=" ", flush=True)
        ok = send_email(email, name, category, slug)
        if ok:
            row["contacted"]    = "yes"
            row["contact_date"] = today
            print("✓ sent")
            sent += 1
        else:
            print("✗ failed")

        time.sleep(random.uniform(1.5, 3.0))  # be gentle on the API

    # Write updated CSV
    tmp = LEADS_CSV + ".tmp"
    with open(tmp, "w", newline="") as f:
        fieldnames = ["slug","name","category","website","email","email_found","contacted","contact_date","replied"]
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    shutil.move(tmp, LEADS_CSV)

    print(f"\nDone. {sent} emails sent today. Run again tomorrow for the next batch.")
    print(f"To send follow-ups, run: python3 send_followup.py")

if __name__ == "__main__":
    main()
