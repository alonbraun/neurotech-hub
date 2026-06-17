import { getAllFiles } from "@/lib/content";
import Link from "next/link";
import fs from "fs";
import path from "path";

export const metadata = {
  title: "Neurotech Events — NeuroTech.com",
  description: "Upcoming neurotechnology conferences, meetups, and industry events worldwide.",
};

export const revalidate = 3600;

const CATEGORY_COLORS: Record<string, string> = {
  Conference:  "bg-blue-50 text-blue-700 border-blue-100",
  Summit:      "bg-purple-50 text-purple-700 border-purple-100",
  Congress:    "bg-teal-50 text-teal-700 border-teal-100",
  Workshop:    "bg-amber-50 text-amber-700 border-amber-100",
  Symposium:   "bg-rose-50 text-rose-700 border-rose-100",
  Meetup:      "bg-green-50 text-green-700 border-green-100",
  Other:       "bg-gray-50 text-gray-600 border-gray-100",
};

const FLAG: Record<string, string> = {
  London: "🇬🇧", Paris: "🇫🇷", Amsterdam: "🇳🇱", Berlin: "🇩🇪",
  Barcelona: "🇪🇸", Dubai: "🇦🇪", "New York": "🇺🇸", "San Francisco": "🇺🇸",
  Chicago: "🇺🇸", Denver: "🇺🇸", Brussels: "🇧🇪",
};

function getFlag(city: string) {
  for (const [k, v] of Object.entries(FLAG)) {
    if (city?.toLowerCase().includes(k.toLowerCase())) return v;
  }
  return "🌍";
}

function formatDate(d: string) {
  if (!d) return "";
  const dt = new Date(d + "T12:00:00Z");
  return dt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function weekLabel(d: string) {
  const today = new Date(); today.setHours(0,0,0,0);
  const dt = new Date(d + "T12:00:00Z");
  const diff = Math.floor((dt.getTime() - today.getTime()) / 86400000);
  if (diff <= 7)  return "This week";
  if (diff <= 14) return "Next week";
  if (diff <= 31) return "This month";
  return new Date(d + "T12:00:00Z").toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

export default function EventsPage() {
  const today = new Date().toISOString().split("T")[0];

  // Curated conferences from markdown
  const curated = (getAllFiles("events") as any[])
    .filter((e) => e.date >= today)
    .map((e) => ({ ...e, type: "curated", category: e.category || "Conference", cityName: e.city }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Eventbrite events from JSON
  let ebEvents: any[] = [];
  try {
    const ebPath = path.join(process.cwd(), "content/events/eventbrite.json");
    if (fs.existsSync(ebPath)) {
      ebEvents = JSON.parse(fs.readFileSync(ebPath, "utf8"))
        .filter((e: any) => e.date >= today)
        .map((e: any) => ({
          slug: e.id,
          name: e.name,
          date: e.date,
          end_date: e.end_date,
          city: e.city,
          country: e.country,
          venue: e.venue,
          website: e.url,
          category: "Meetup",
          cityName: e.city_tag,
          free: e.free,
          source: "eventbrite",
          type: "eventbrite",
        }));
    }
  } catch (_) {}

  const allEvents = [...curated, ...ebEvents].sort((a, b) => a.date.localeCompare(b.date));

  // Group by week/month label
  const grouped: Record<string, any[]> = {};
  for (const e of allEvents) {
    const label = weekLabel(e.date);
    if (!grouped[label]) grouped[label] = [];
    grouped[label].push(e);
  }

  const cities = ["All cities", "London", "Paris", "Amsterdam", "Berlin", "Barcelona", "Dubai"];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-[#0d1525] px-5 py-12">
        <div className="max-w-6xl mx-auto">
          <p className="text-[#5da8e0] text-xs font-bold tracking-widest uppercase mb-3">Global Neurotech Events</p>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Industry Events Calendar</h1>
          <p className="text-[#9fcae8] text-sm max-w-xl">Conferences, meetups &amp; events — updated daily from Eventbrite and curated sources.</p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white border-b border-gray-100 sticky top-16 z-40">
        <div className="max-w-6xl mx-auto px-5 py-3 flex items-center gap-2 overflow-x-auto">
          {cities.map((c) => (
            <span key={c} className="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border cursor-pointer
              first:bg-[#1a3d6b] first:text-white first:border-[#1a3d6b]
              not-first:border-gray-200 not-first:text-gray-600 not-first:hover:border-[#1a3d6b] not-first:hover:text-[#1a3d6b] transition-colors">
              {c === "All cities" ? c : `${getFlag(c)} ${c}`}
            </span>
          ))}
          <div className="ml-auto shrink-0 text-xs text-gray-400">{allEvents.length} events</div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-5 py-8">
        {Object.keys(grouped).length === 0 && (
          <div className="text-center py-20 text-gray-400">No upcoming events. Check back soon.</div>
        )}

        {Object.entries(grouped).map(([label, events]) => (
          <div key={label} className="mb-8">
            <h2 className="text-xs font-bold tracking-widest text-gray-400 uppercase mb-3 flex items-center gap-3">
              {label}
              <span className="text-gray-300 font-normal normal-case tracking-normal">{events.length} event{events.length !== 1 ? "s" : ""}</span>
            </h2>
            <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50 overflow-hidden">
              {events.map((event: any) => (
                <a key={event.slug} href={event.website} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-[#f8fbff] transition-colors group">
                  {/* Date block */}
                  <div className="w-12 text-center shrink-0">
                    <p className="text-[10px] font-bold text-gray-400 uppercase leading-none">
                      {new Date(event.date + "T12:00:00Z").toLocaleDateString("en-GB", { month: "short" })}
                    </p>
                    <p className="text-2xl font-bold text-[#1a3d6b] leading-tight">
                      {new Date(event.date + "T12:00:00Z").getDate()}
                    </p>
                  </div>

                  {/* Flag */}
                  <span className="text-xl shrink-0">{getFlag(event.city)}</span>

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm group-hover:text-[#1a3d6b] transition-colors truncate leading-snug">
                      {event.name}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">
                      {event.city}{event.venue ? ` · ${event.venue}` : ""}
                    </p>
                  </div>

                  {/* Tags */}
                  <div className="hidden sm:flex items-center gap-2 shrink-0">
                    {event.free && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-100">Free</span>
                    )}
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${CATEGORY_COLORS[event.category] || CATEGORY_COLORS.Other}`}>
                      {event.category}
                    </span>
                  </div>

                  <svg className="w-4 h-4 text-gray-300 group-hover:text-[#1a3d6b] shrink-0 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </a>
              ))}
            </div>
          </div>
        ))}

        {/* Feature your event CTA */}
        <div className="mt-6 bg-[#0d1525] rounded-2xl p-7 flex flex-col sm:flex-row items-center justify-between gap-5">
          <div>
            <h3 className="text-white font-bold text-base mb-1">Running a neurotech event?</h3>
            <p className="text-[#9fcae8] text-sm">Get featured placement and newsletter inclusion — reach 200+ industry companies.</p>
          </div>
          <Link href="/advertise" className="shrink-0 bg-[#1a3d6b] hover:bg-[#1d5ea0] text-white font-semibold px-6 py-2.5 rounded-xl transition-colors text-sm whitespace-nowrap">
            Feature your event →
          </Link>
        </div>
      </div>
    </div>
  );
}
