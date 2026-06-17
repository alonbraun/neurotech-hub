#!/usr/bin/env python3
"""
Fetches upcoming neurotech events from Eventbrite by scraping search pages.
Eventbrite deprecated their public search API for new apps — this scrapes
the JSON-LD embedded in search result HTML instead.
Saves results to content/events/eventbrite.json
"""

import os, json, urllib.request, urllib.parse, datetime, re, time, random

OUT = os.path.join(os.path.dirname(__file__), "../content/events/eventbrite.json")

# city slug as Eventbrite uses in URLs
CITIES = [
    ("united-kingdom--london",       "London"),
    ("france--paris",                "Paris"),
    ("netherlands--amsterdam",       "Amsterdam"),
    ("germany--berlin",              "Berlin"),
    ("spain--barcelona",             "Barcelona"),
    ("united-arab-emirates--dubai",  "Dubai"),
]

KEYWORDS = [
    "neuroscience",
    "neurotech",
    "brain",
    "psychedelic",
    "cognitive",
    "mental-health-tech",
]

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml",
    "Accept-Language": "en-GB,en;q=0.9",
}

def fetch_page(city_slug, keyword):
    url = f"https://www.eventbrite.com/d/{city_slug}/{keyword}/"
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return r.read().decode("utf-8", errors="ignore")
    except Exception as e:
        print(f"  Error {city_slug}/{keyword}: {e}")
        return ""

def extract_events(html, city_tag):
    events = []
    # Eventbrite embeds a server-side data blob as window.__SERVER_DATA__ or JSON-LD
    # Try JSON-LD first
    ld_blocks = re.findall(r'<script type="application/ld\+json">(.*?)</script>', html, re.DOTALL)
    for block in ld_blocks:
        try:
            data = json.loads(block)
            items = data if isinstance(data, list) else [data]
            for item in items:
                if item.get("@type") != "Event":
                    continue
                start = (item.get("startDate") or "")[:10]
                end   = (item.get("endDate")   or start)[:10]
                loc   = item.get("location") or {}
                addr  = loc.get("address") or {}
                events.append({
                    "id":       re.sub(r"[^0-9]", "", item.get("url", "") or "") or item.get("name","")[:40],
                    "name":     item.get("name", ""),
                    "date":     start,
                    "end_date": end,
                    "city":     addr.get("addressLocality") or city_tag,
                    "country":  addr.get("addressCountry") or "",
                    "venue":    loc.get("name") or "",
                    "url":      item.get("url", ""),
                    "free":     False,
                    "source":   "eventbrite",
                    "city_tag": city_tag,
                })
        except Exception:
            continue

    # Fallback: try __SERVER_DATA__ blob
    if not events:
        m = re.search(r'window\.__SERVER_DATA__\s*=\s*(\{.*?\});', html, re.DOTALL)
        if m:
            try:
                data = json.loads(m.group(1))
                # navigate to events list
                search = data.get("search_data", {}) or data.get("data", {})
                for e in (search.get("events", {}).get("results") or []):
                    start = (e.get("start_date") or "")[:10]
                    end   = (e.get("end_date")   or start)[:10]
                    events.append({
                        "id":       str(e.get("id", "") or e.get("eid", "")),
                        "name":     e.get("name", ""),
                        "date":     start,
                        "end_date": end,
                        "city":     e.get("primary_venue", {}).get("address", {}).get("city") or city_tag,
                        "country":  e.get("primary_venue", {}).get("address", {}).get("country") or "",
                        "venue":    e.get("primary_venue", {}).get("name") or "",
                        "url":      e.get("url") or "",
                        "free":     e.get("is_free", False),
                        "source":   "eventbrite",
                        "city_tag": city_tag,
                    })
            except Exception:
                pass
    return events

def main():
    seen = set()
    results = []
    today = datetime.date.today().isoformat()

    for city_slug, city_tag in CITIES:
        for kw in KEYWORDS:
            print(f"  Fetching: {city_tag} / {kw}")
            html = fetch_page(city_slug, kw)
            events = extract_events(html, city_tag)
            print(f"    Found {len(events)} events")
            for e in events:
                if not e["id"] or e["id"] in seen:
                    continue
                if not e["date"] or e["date"] < today:
                    continue
                seen.add(e["id"])
                results.append(e)
            time.sleep(random.uniform(1.0, 2.5))

    results.sort(key=lambda e: e["date"])
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w") as f:
        json.dump(results, f, indent=2)
    print(f"\nSaved {len(results)} events to eventbrite.json")

if __name__ == "__main__":
    main()
