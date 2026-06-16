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

CATEGORY_HASHTAGS = {
    "Funding":   ["#Neurotech", "#VentureCapital", "#HealthTech"],
    "Research":  ["#Neurotech", "#Neuroscience", "#Research"],
    "Product":   ["#Neurotech", "#BCI", "#Innovation"],
    "Industry":  ["#Neurotech", "#HealthTech", "#Industry"],
    "Policy":    ["#Neurotech", "#Policy", "#FDA"],
}
DEFAULT_HASHTAGS = ["#Neurotech", "#BCI", "#HealthTech"]

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
    text = f"{title}\n\n{excerpt}\n\nRead more on NeuroTech.com 👉 {url}\n\n{' '.join(hashtags)}"
    return text

def main():
    tracker = load_tracker()
    posted_slugs = set(tracker["posted"])

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
        pending.append({
            "slug": slug,
            "title": fm.get("title", ""),
            "excerpt": fm.get("excerpt", ""),
            "category": fm.get("category", ""),
            "date": fm.get("date", ""),
            "text": make_post_copy(fm.get("title",""), fm.get("excerpt",""), fm.get("category",""), slug),
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
