#!/usr/bin/env python3
"""
Step 1: Scrape contact emails from company websites.
Reads all company markdown files, visits each website, finds emails.
Saves results to scripts/leads.csv
"""

import os, re, glob, csv, time, random
from urllib.parse import urljoin, urlparse

try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:
    print("Run: pip install requests beautifulsoup4")
    exit(1)

CONTENT_DIR = os.path.join(os.path.dirname(__file__), "../content/companies")
OUTPUT_CSV  = os.path.join(os.path.dirname(__file__), "leads.csv")

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

EMAIL_RE = re.compile(r'[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}')
SKIP_DOMAINS = {"example.com","sentry.io","wixpress.com","squarespace.com","wordpress.com","privacy","noreply","no-reply","support@apple","@2x","@3x"}

def extract_emails(html, base_domain):
    emails = set()
    # mailto links first (highest quality)
    soup = BeautifulSoup(html, "html.parser")
    for a in soup.find_all("a", href=True):
        if a["href"].startswith("mailto:"):
            em = a["href"][7:].split("?")[0].strip().lower()
            if em and "@" in em:
                emails.add(em)
    # regex fallback
    for em in EMAIL_RE.findall(html):
        em = em.lower()
        if any(s in em for s in SKIP_DOMAINS):
            continue
        if em.endswith((".png",".jpg",".svg",".css",".js")):
            continue
        emails.add(em)
    # prefer emails matching the company domain
    domain_emails = [e for e in emails if base_domain in e]
    return domain_emails[0] if domain_emails else (list(emails)[0] if emails else None)

def scrape_email(website):
    if not website or not website.startswith("http"):
        return None
    parsed = urlparse(website)
    base_domain = parsed.netloc.replace("www.", "")

    pages_to_try = [website, urljoin(website, "/contact"), urljoin(website, "/about"), urljoin(website, "/contact-us")]

    for url in pages_to_try:
        try:
            r = requests.get(url, headers=HEADERS, timeout=8, allow_redirects=True)
            if r.status_code == 200:
                email = extract_emails(r.text, base_domain)
                if email:
                    return email
        except Exception:
            continue
        time.sleep(random.uniform(0.3, 0.8))
    return None

def parse_frontmatter(filepath):
    content = open(filepath).read()
    parts = content.split("---")
    if len(parts) < 2:
        return {}
    fm = {}
    for line in parts[1].strip().split("\n"):
        if ":" in line:
            k, _, v = line.partition(":")
            fm[k.strip()] = v.strip().strip('"')
    return fm

def main():
    files = sorted(glob.glob(f"{CONTENT_DIR}/*.md"))
    print(f"Found {len(files)} companies\n")

    # Load already-processed slugs
    existing = {}
    if os.path.exists(OUTPUT_CSV):
        with open(OUTPUT_CSV) as f:
            for row in csv.DictReader(f):
                existing[row["slug"]] = row

    fieldnames = ["slug","name","category","website","email","email_found","contacted","contact_date","replied"]

    with open(OUTPUT_CSV, "w", newline="") as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()

        for i, filepath in enumerate(files):
            fm = parse_frontmatter(filepath)
            slug = fm.get("slug", "")
            name = fm.get("name", "")
            website = fm.get("website", "")
            category = fm.get("category", "")

            # Skip if already processed
            if slug in existing and existing[slug].get("email"):
                writer.writerow(existing[slug])
                print(f"  [{i+1}/{len(files)}] {name} — already scraped: {existing[slug]['email']}")
                continue

            print(f"  [{i+1}/{len(files)}] {name} ({website[:40] if website else 'no website'})...", end=" ", flush=True)

            if not website:
                print("no website")
                writer.writerow({"slug":slug,"name":name,"category":category,"website":"","email":"","email_found":"no","contacted":"no","contact_date":"","replied":""})
                continue

            email = scrape_email(website)
            if email:
                print(f"✓ {email}")
            else:
                print("not found")

            writer.writerow({
                "slug": slug,
                "name": name,
                "category": category,
                "website": website,
                "email": email or "",
                "email_found": "yes" if email else "no",
                "contacted": "no",
                "contact_date": "",
                "replied": "",
            })
            time.sleep(random.uniform(0.5, 1.5))

    found = sum(1 for r in csv.DictReader(open(OUTPUT_CSV)) if r["email"])
    print(f"\nDone. {found}/{len(files)} emails found → scripts/leads.csv")

if __name__ == "__main__":
    main()
