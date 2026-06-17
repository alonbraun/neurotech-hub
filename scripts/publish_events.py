#!/usr/bin/env python3
"""
Weekly events scanner — uses Claude to find upcoming neurotech events
and adds new ones as markdown files in content/events/.
Skips events already listed.
"""

import os, json, re, datetime, urllib.request, glob

ANTHROPIC_API_KEY = os.environ["ANTHROPIC_API_KEY"]
GITHUB_TOKEN      = os.environ.get("GITHUB_TOKEN", "")
REPO              = "alonbraun/neurotech-hub"
EVENTS_DIR        = os.path.join(os.path.dirname(__file__), "../content/events")

def existing_slugs():
    files = glob.glob(os.path.join(EVENTS_DIR, "*.md"))
    return {os.path.basename(f).replace(".md", "") for f in files}

def ask_claude(existing):
    today = datetime.date.today().isoformat()
    one_year = (datetime.date.today() + datetime.timedelta(days=365)).isoformat()
    prompt = f"""Today is {today}. List 8 real, confirmed upcoming neurotechnology industry events happening between now and {one_year}.

Include global events: conferences, summits, congresses, symposia related to BCIs, neuromodulation, cognitive health, psychedelics, neurofeedback, neural engineering, or neurotech investment.

Already listed slugs (skip these): {json.dumps(list(existing))}

Return ONLY a JSON array. Each object must have these exact keys:
- slug: kebab-case unique identifier (e.g. sfn-annual-meeting-2026)
- name: full official event name
- date: start date YYYY-MM-DD
- end_date: end date YYYY-MM-DD
- city: host city
- country: full country name
- venue: venue name
- website: official URL
- category: one of Conference, Summit, Congress, Workshop, Symposium
- description: 2-sentence description of what the event covers

Only include events you are confident exist. No fictional events."""

    payload = json.dumps({
        "model": "claude-haiku-4-5-20251001",
        "max_tokens": 2000,
        "messages": [{"role": "user", "content": prompt}]
    }).encode()

    req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages",
        data=payload,
        headers={
            "x-api-key": ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        },
        method="POST"
    )
    with urllib.request.urlopen(req, timeout=60) as r:
        resp = json.loads(r.read())
    text = resp["content"][0]["text"]
    match = re.search(r"\[.*\]", text, re.DOTALL)
    if not match:
        raise ValueError("No JSON array found in Claude response")
    return json.loads(match.group())

def to_markdown(event):
    return f"""---
name: {event['name']}
slug: {event['slug']}
date: {event['date']}
end_date: {event['end_date']}
city: {event['city']}
country: {event['country']}
venue: {event['venue']}
website: {event['website']}
category: {event['category']}
description: {event['description']}
featured: false
---
"""

def commit_file(slug, content):
    path = f"content/events/{slug}.md"
    url = f"https://api.github.com/repos/{REPO}/contents/{path}"
    payload = json.dumps({
        "message": f"Add event: {slug}",
        "content": __import__('base64').b64encode(content.encode()).decode()
    }).encode()
    req = urllib.request.Request(url, data=payload, headers={
        "Authorization": f"token {GITHUB_TOKEN}",
        "Content-Type": "application/json",
        "User-Agent": "neurotech-events/1.0"
    }, method="PUT")
    with urllib.request.urlopen(req, timeout=15) as r:
        return r.status in (200, 201)

def main():
    os.makedirs(EVENTS_DIR, exist_ok=True)
    existing = existing_slugs()
    print(f"Found {len(existing)} existing events")

    events = ask_claude(existing)
    print(f"Claude returned {len(events)} events")

    added = 0
    for event in events:
        slug = event.get("slug", "")
        if not slug or slug in existing:
            print(f"  Skipping {slug} (already exists)")
            continue
        # Skip past events
        if event.get("date", "") < datetime.date.today().isoformat():
            print(f"  Skipping {slug} (past event)")
            continue
        md = to_markdown(event)
        # Write locally (for GitHub Actions which commits the whole tree)
        path = os.path.join(EVENTS_DIR, f"{slug}.md")
        with open(path, "w") as f:
            f.write(md)
        print(f"  Added: {slug}")
        added += 1

    print(f"\nDone. {added} new events added.")

if __name__ == "__main__":
    main()
