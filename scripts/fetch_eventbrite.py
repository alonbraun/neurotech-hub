#!/usr/bin/env python3
"""
Fetches upcoming neurotech events from Eventbrite search pages.
Filters results to keep only neurotech-relevant events by name.
Saves results to content/events/eventbrite.json
"""

import os, json, urllib.request, datetime, re, time, random

OUT = os.path.join(os.path.dirname(__file__), "../content/events/eventbrite.json")

CITIES = [
    ("united-kingdom--london",      "London"),
    ("france--paris",               "Paris"),
    ("netherlands--amsterdam",      "Amsterdam"),
    ("germany--berlin",             "Berlin"),
    ("spain--barcelona",            "Barcelona"),
    ("united-arab-emirates--dubai", "Dubai"),
]

# Specific enough to return mostly neurotech events
KEYWORDS = [
    "neurotech",
    "neuroscience",
    "brain-computer-interface",
    "neurofeedback",
    "psychedelic-therapy",
    "mental-health-technology",
    "neuromodulation",
]

# Filter: event name must contain at least one of these
RELEVANT = [
    "neuro", "brain", "bci", "cognit", "psychedel", "mental health",
    "neurofeed", "neural", "mind science", "consciousness",
    "alzheimer", "parkinson", "epilep", "eeg", "tms", "dbs",
]

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml",
    "Accept-Language": "en-GB,en;q=0.9",
}

def is_relevant(name):
    n = name.lower()
    return any(kw in n for kw in RELEVANT)

def fetch_events(city_slug, keyword, city_tag):
    url = f"https://www.eventbrite.com/d/{city_slug}/{keyword}/"
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            html = r.read().decode("utf-8", errors="ignore")
    except Exception as e:
        print(f"    Error: {e}")
        return []
    m = re.search(r'window\.__SERVER_DATA__\s*=\s*(\{.*?\});', html, re.DOTALL)
    if not m:
        return []
    try:
        data = json.loads(m.group(1))
        results = data["search_data"]["events"]["results"]
    except Exception:
        return []
    today = datetime.date.today().isoformat()
    events = []
    for e in results:
        name  = e.get("name", "")
        if not is_relevant(name):
            continue
        start = (e.get("start_date") or "")[:10]
        end   = (e.get("end_date")   or start)[:10]
        if not start or start < today:
            continue
        venue = (e.get("primary_venue") or {})
        addr  = (venue.get("address") or {})
        events.append({
            "id":       str(e.get("id") or e.get("eid") or ""),
            "name":     name,
            "date":     start,
            "end_date": end,
            "city":     addr.get("city") or city_tag,
            "country":  addr.get("country") or "",
            "venue":    venue.get("name") or "",
            "url":      e.get("url", ""),
            "free":     e.get("is_free", False),
            "source":   "eventbrite",
            "city_tag": city_tag,
        })
    return events

def main():
    seen  = set()
    results = []
    for city_slug, city_tag in CITIES:
        for kw in KEYWORDS:
            print(f"  {city_tag} / {kw}", end=" ... ", flush=True)
            events = fetch_events(city_slug, kw, city_tag)
            new = [e for e in events if e["id"] and e["id"] not in seen]
            for e in new:
                seen.add(e["id"])
                results.append(e)
            print(f"{len(new)} new")
            time.sleep(random.uniform(1.5, 3.0))
    results.sort(key=lambda e: e["date"])
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w") as f:
        json.dump(results, f, indent=2)
    print(f"\nSaved {len(results)} relevant events.")

if __name__ == "__main__":
    main()
