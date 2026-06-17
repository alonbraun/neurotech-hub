#!/usr/bin/env python3
"""
Fetches upcoming neurotech-related events from Eventbrite for key cities.
Saves results to content/events/eventbrite.json
"""

import os, json, urllib.request, urllib.parse, datetime

TOKEN = os.environ["EVENTBRITE_TOKEN"]
OUT   = os.path.join(os.path.dirname(__file__), "../content/events/eventbrite.json")

CITIES = [
    "London, UK",
    "Paris, France",
    "Amsterdam, Netherlands",
    "Berlin, Germany",
    "Barcelona, Spain",
    "Dubai, UAE",
    "New York, USA",
    "San Francisco, USA",
]

KEYWORDS = [
    "neuroscience", "neurotech", "brain computer interface",
    "neurofeedback", "neuromodulation", "psychedelic",
    "cognitive health", "mental health tech", "neural",
]

def fetch(city, keyword):
    start = datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
    end   = (datetime.datetime.utcnow() + datetime.timedelta(days=90)).strftime("%Y-%m-%dT%H:%M:%SZ")
    params = urllib.parse.urlencode({
        "q": keyword,
        "location.address": city,
        "location.within": "50km",
        "start_date.range_start": start,
        "start_date.range_end": end,
        "expand": "venue",
        "sort_by": "date",
    })
    url = f"https://www.eventbriteapi.com/v3/events/search/?{params}"
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {TOKEN}", "User-Agent": "neurotech/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            return json.loads(r.read()).get("events", [])
    except Exception as e:
        print(f"  Error {city}/{keyword}: {e}")
        return []

def parse(event, city):
    start = event.get("start", {}).get("local", "")[:10]
    end   = event.get("end",   {}).get("local", "")[:10]
    venue = event.get("venue") or {}
    addr  = venue.get("address") or {}
    return {
        "id":       event["id"],
        "name":     event["name"]["text"],
        "date":     start,
        "end_date": end,
        "city":     addr.get("city") or city.split(",")[0],
        "country":  addr.get("country") or "",
        "venue":    venue.get("name") or "",
        "url":      event["url"],
        "online":   event.get("online_event", False),
        "free":     event.get("is_free", False),
        "source":   "eventbrite",
        "city_tag": city.split(",")[0],
    }

def main():
    seen = set()
    results = []
    today = datetime.date.today().isoformat()

    for city in CITIES:
        for kw in KEYWORDS:
            print(f"  Fetching: {city} / {kw}")
            events = fetch(city, kw)
            for e in events:
                if e["id"] in seen:
                    continue
                seen.add(e["id"])
                parsed = parse(e, city)
                if parsed["date"] >= today:
                    results.append(parsed)

    results.sort(key=lambda e: e["date"])
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w") as f:
        json.dump(results, f, indent=2)
    print(f"\nSaved {len(results)} events to eventbrite.json")

if __name__ == "__main__":
    main()
