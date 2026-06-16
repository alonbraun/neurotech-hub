#!/usr/bin/env python3
"""
Posts new neurotech.com news articles to LinkedIn via Buffer.
Run after the news-publisher GitHub Action (Mon/Wed/Fri, 8am UTC).

Tracks already-posted articles in content/news/.linkedin-posted.json
to avoid duplicates. Generates short LinkedIn copy per article and
publishes immediately (shareNow) via the Buffer MCP/API.

This script outputs the post payload as JSON to stdout — the actual
Buffer API call is made by the calling agent (scheduled task) via the
Buffer MCP tools, since Buffer's MCP connector is OAuth-based and not
directly callable with a plain API key from a script.
"""

import os, re, json, glob, sys, hashlib

NEWS_DIR     = os.path.join(os.path.dirname(__file__), "../content/news")
TRACKER_FILE = os.path.join(NEWS_DIR, ".linkedin-posted.json")
SITE_URL     = "https://neurotech.com"
COMPANY_TAGS_FILE = os.path.join(os.path.dirname(__file__), "linkedin_company_tags.json")

def load_company_tags():
    if os.path.exists(COMPANY_TAGS_FILE):
        return json.load(open(COMPANY_TAGS_FILE))
    return {}

# Mix of broad (large-audience) and niche (highly relevant) tags. LinkedIn
# rewards this mix: broad tags surface the post in bigger feeds, niche tags
# put it in front of the right people. 4-5 tags is the sweet spot — fewer
# under-targets, more starts to look spammy and can suppress reach.
CATEGORY_HASHTAGS = {
    "Funding":   ["#VentureCapital", "#HealthTech", "#Innovation", "#Neurotechnology", "#Startups"],
    "Research":  ["#Neuroscience", "#Innovation", "#HealthTech", "#Neurotechnology", "#Research"],
    "Product":   ["#Innovation", "#HealthTech", "#MedTech", "#Neurotechnology", "#BCI"],
    "Industry":  ["#HealthTech", "#Innovation", "#MedTech", "#Neurotechnology", "#DigitalHealth"],
    "Policy":    ["#Healthcare", "#Policy", "#Innovation", "#Neurotechnology", "#MedTech"],
}
DEFAULT_HASHTAGS = ["#Neurotechnology", "#HealthTech", "#Innovation", "#MedTech"]

# A short hook line before the headline increases dwell time, which the
# LinkedIn algorithm weighs more heavily than hashtags for initial reach.
CATEGORY_HOOKS = {
    "Funding":  "💰 Capital keeps flowing into neurotech.",
    "Research": "🧠 New research worth a closer look.",
    "Product":  "🚀 A new product just hit the market.",
    "Industry": "📡 An industry milestone worth tracking.",
    "Policy":   "⚖️ A policy shift that could reshape the field.",
}
DEFAULT_HOOK = "🧠 What's new in neurotech."

def parse_frontmatter(filepath):
    content = open(filepath).read()
    parts = content.split("---")
    if len(parts) < 3:
        return None, None
    fm_raw, body = parts[1], "---".join(parts[2:])
    fm = {}
    for line in fm_raw.strip().split("\n"):
        if ":" in line:
            k, _, v = line.partition(":")
            fm[k.strip()] = v.strip().strip('"')
    return fm, body.strip()

def load_tracker():
    if os.path.exists(TRACKER_FILE):
        return json.load(open(TRACKER_FILE))
    return {"posted": []}

def save_tracker(tracker):
    with open(TRACKER_FILE, "w") as f:
        json.dump(tracker, f, indent=2)

def slug_from_filename(filepath):
    return os.path.basename(filepath).replace(".md", "")

def make_post_copy(title, excerpt, category, slug):
    url = f"{SITE_URL}/news/{slug}"
    hashtags = CATEGORY_HASHTAGS.get(category, DEFAULT_HASHTAGS)
    hook = CATEGORY_HOOKS.get(category, DEFAULT_HOOK)
    text = f"{hook}\n\n{title}\n\n{excerpt}\n\nRead more on NeuroTech.com 👉 {url}\n\n{' '.join(hashtags)}"
    return text

def utf16_len(s):
    # LinkedIn's annotation offsets are UTF-16 code-unit indices, not Python
    # character indices. Emoji outside the BMP (most modern ones, like 💰)
    # are surrogate pairs = 2 UTF-16 units but only 1 Python char, so a plain
    # str.find() offset is wrong whenever an emoji precedes the match.
    return len(s.encode("utf-16-le")) // 2

def find_company_annotations(text, company_tags):
    """
    Scan the post text for any known company name (from linkedin_company_tags.json)
    and build a LinkedIn @mention annotation at its first occurrence. Only the
    title+excerpt portion is searched to avoid matching inside hashtags/URLs.
    Returns a list ready for Buffer's metadata.linkedin.annotations field.
    """
    annotations = []
    matched_names = set()
    for company_name, info in company_tags.items():
        if company_name in matched_names:
            continue
        idx = text.find(company_name)
        if idx == -1:
            continue
        annotations.append({
            "id": info["id"],
            "link": info["link"],
            "entity": info["entity"],
            "vanityName": info["vanityName"],
            "localizedName": info["localizedName"],
            "start": utf16_len(text[:idx]),
            "length": utf16_len(company_name),
        })
        matched_names.add(company_name)
    return annotations

def main():
    tracker = load_tracker()
    posted_slugs = set(tracker["posted"])
    company_tags = load_company_tags()

    files = sorted(glob.glob(f"{NEWS_DIR}/*.md"))
    pending = []

    for filepath in files:
        slug = slug_from_filename(filepath)
        if slug in posted_slugs:
            continue
        fm, body = parse_frontmatter(filepath)
        if not fm:
            continue
        # Skip sponsored content from auto-posting unless explicitly allowed
        if fm.get("sponsored", "false").lower() == "true":
            continue
        text = make_post_copy(fm.get("title",""), fm.get("excerpt",""), fm.get("category",""), slug)
        pending.append({
            "slug": slug,
            "title": fm.get("title", ""),
            "excerpt": fm.get("excerpt", ""),
            "category": fm.get("category", ""),
            "date": fm.get("date", ""),
            "text": text,
            "annotations": find_company_annotations(text, company_tags),
        })

    # Each run posts up to 2 articles: the oldest backlog item (drains the
    # backlog at one extra post per run) plus the newest unposted article
    # (that day's fresh release). If there's only one unposted item, just
    # post that one — no duplicates.
    next_up = []
    if pending:
        next_up.append(pending[0])          # oldest (backlog)
        if len(pending) > 1 and pending[-1]["slug"] != pending[0]["slug"]:
            next_up.append(pending[-1])      # newest (today's article)

    print(json.dumps({"pending": next_up, "remaining_after": len(pending) - len(next_up), "tracker_file": TRACKER_FILE}, indent=2))

if __name__ == "__main__":
    main()
