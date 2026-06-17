"use client";
import { useState } from "react";

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
  london: "🇬🇧", paris: "🇫🇷", amsterdam: "🇳🇱", berlin: "🇩🇪",
  barcelona: "🇪🇸", dubai: "🇦🇪", "new york": "🇺🇸", "san francisco": "🇺🇸",
  chicago: "🇺🇸", denver: "🇺🇸", brussels: "🇧🇪",
};

function getFlag(city: string) {
  const c = (city || "").toLowerCase();
  for (const [k, v] of Object.entries(FLAG)) {
    if (c.includes(k)) return v;
  }
  return "🌍";
}

function weekLabel(d: string) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dt = new Date(d + "T12:00:00Z");
  const diff = Math.floor((dt.getTime() - today.getTime()) / 86400000);
  if (diff <= 7)  return "This week";
  if (diff <= 14) return "Next week";
  if (diff <= 31) return "This month";
  return dt.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

const CITIES = ["All cities", "London", "Paris", "Amsterdam", "Berlin", "Barcelona", "Dubai"];

export default function EventsClient({ events }: { events: any[] }) {
  const [activeCity, setActiveCity] = useState("All cities");

  const filtered = activeCity === "All cities"
    ? events
    : events.filter((e) => (e.city || e.city_tag || "").toLowerCase().includes(activeCity.toLowerCase()));

  const grouped: Record<string, any[]> = {};
  for (const e of filtered) {
    const label = weekLabel(e.date);
    if (!grouped[label]) grouped[label] = [];
    grouped[label].push(e);
  }

  return (
    <>
      {/* Filter bar */}
      <div className="bg-white border-b border-gray-100 sticky top-16 z-40">
        <div className="max-w-6xl mx-auto px-5 py-3 flex items-center gap-2 overflow-x-auto">
          {CITIES.map((c) => (
            <button
              key={c}
              onClick={() => setActiveCity(c)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                activeCity === c
                  ? "bg-[#1a3d6b] text-white border-[#1a3d6b]"
                  : "border-gray-200 text-gray-600 hover:border-[#1a3d6b] hover:text-[#1a3d6b]"
              }`}
            >
              {c === "All cities" ? c : `${getFlag(c)} ${c}`}
            </button>
          ))}
          <div className="ml-auto shrink-0 text-xs text-gray-400 whitespace-nowrap">{filtered.length} events</div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-5 py-8">
        {Object.keys(grouped).length === 0 && (
          <div className="text-center py-20 text-gray-400">No events found for {activeCity}.</div>
        )}

        {Object.entries(grouped).map(([label, evts]) => (
          <div key={label} className="mb-8">
            <h2 className="text-xs font-bold tracking-widest text-gray-400 uppercase mb-3 flex items-center gap-3">
              {label}
              <span className="text-gray-300 font-normal normal-case tracking-normal">{evts.length} event{evts.length !== 1 ? "s" : ""}</span>
            </h2>
            <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50 overflow-hidden">
              {evts.map((event: any, i: number) => (
                <a key={event.slug || event.id || i} href={event.website || event.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-[#f8fbff] transition-colors group">
                  <div className="w-12 text-center shrink-0">
                    <p className="text-[10px] font-bold text-gray-400 uppercase leading-none">
                      {new Date(event.date + "T12:00:00Z").toLocaleDateString("en-GB", { month: "short" })}
                    </p>
                    <p className="text-2xl font-bold text-[#1a3d6b] leading-tight">
                      {new Date(event.date + "T12:00:00Z").getDate()}
                    </p>
                  </div>
                  <span className="text-xl shrink-0">{getFlag(event.city || event.city_tag || "")}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm group-hover:text-[#1a3d6b] transition-colors truncate leading-snug">
                      {event.name}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">
                      {event.city || event.city_tag}{event.venue ? ` · ${event.venue}` : ""}
                    </p>
                  </div>
                  <div className="hidden sm:flex items-center gap-2 shrink-0">
                    {event.free && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-100">Free</span>
                    )}
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${CATEGORY_COLORS[event.category] || CATEGORY_COLORS.Other}`}>
                      {event.category || "Event"}
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
      </div>
    </>
  );
}
