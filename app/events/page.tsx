import { getAllFiles } from "@/lib/content";
import Link from "next/link";

export const metadata = {
  title: "Neurotech Events 2026 — NeuroTech.com",
  description: "Upcoming neurotechnology conferences, summits, and congresses around the world.",
};

const CATEGORY_COLORS: Record<string, string> = {
  Conference: "bg-blue-50 text-blue-700",
  Summit: "bg-purple-50 text-purple-700",
  Congress: "bg-teal-50 text-teal-700",
  Workshop: "bg-amber-50 text-amber-700",
  Symposium: "bg-rose-50 text-rose-700",
};

const FLAG: Record<string, string> = {
  "United States": "🇺🇸", "United Kingdom": "🇬🇧", "Germany": "🇩🇪",
  "Belgium": "🇧🇪", "France": "🇫🇷", "Canada": "🇨🇦",
  "Australia": "🇦🇺", "Netherlands": "🇳🇱", "Switzerland": "🇨🇭",
  "Japan": "🇯🇵", "Singapore": "🇸🇬",
};

function formatDateRange(date: string, endDate?: string) {
  const start = new Date(date);
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  if (!endDate) return start.toLocaleDateString("en-GB", { ...opts, year: "numeric" });
  const end = new Date(endDate);
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  if (sameMonth) {
    return `${start.toLocaleDateString("en-GB", opts)}–${end.getDate()}, ${end.getFullYear()}`;
  }
  return `${start.toLocaleDateString("en-GB", opts)} – ${end.toLocaleDateString("en-GB", { ...opts, year: "numeric" })}`;
}

export default function EventsPage() {
  const today = new Date().toISOString().split("T")[0];
  const allEvents = (getAllFiles("events") as any[])
    .filter((e) => e.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date));

  const upcoming = allEvents.slice(0, 3);
  const rest = allEvents.slice(3);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-[#0d1525] px-5 py-14">
        <div className="max-w-5xl mx-auto">
          <p className="text-[#5da8e0] text-xs font-bold tracking-widest uppercase mb-3">Global Neurotech Events</p>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">Industry Events 2026</h1>
          <p className="text-[#9fcae8] text-base max-w-xl">
            Conferences, summits, and congresses for the neurotechnology community — updated automatically every week.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-5 py-10">
        {/* Upcoming next */}
        {upcoming.length > 0 && (
          <div className="mb-10">
            <h2 className="text-xs font-bold tracking-widest text-gray-400 uppercase mb-5">Coming up next</h2>
            <div className="grid md:grid-cols-3 gap-4">
              {upcoming.map((event: any) => (
                <a key={event.slug} href={event.website} target="_blank" rel="noopener noreferrer"
                  className="bg-white rounded-2xl border border-gray-100 p-5 hover:border-[#1a3d6b]/30 hover:shadow-sm transition-all flex flex-col">
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${CATEGORY_COLORS[event.category] || "bg-gray-100 text-gray-600"}`}>
                      {event.category}
                    </span>
                    <span className="text-lg">{FLAG[event.country] || "🌍"}</span>
                  </div>
                  <h3 className="font-bold text-gray-900 text-sm leading-snug mb-2">{event.name}</h3>
                  <p className="text-xs text-[#1a3d6b] font-semibold mb-1">{formatDateRange(event.date, event.end_date)}</p>
                  <p className="text-xs text-gray-400 mb-3">{event.city}, {event.country}</p>
                  <p className="text-xs text-gray-500 leading-relaxed flex-1">{event.description.slice(0, 120)}…</p>
                  <p className="text-xs text-[#1a3d6b] font-medium mt-3">View event →</p>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* All events list */}
        {rest.length > 0 && (
          <div>
            <h2 className="text-xs font-bold tracking-widest text-gray-400 uppercase mb-5">All upcoming events</h2>
            <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
              {rest.map((event: any) => (
                <a key={event.slug} href={event.website} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-4 px-6 py-4 hover:bg-[#f8fbff] transition-colors group">
                  <div className="w-14 text-center shrink-0">
                    <p className="text-[10px] font-bold text-gray-400 uppercase">{new Date(event.date).toLocaleDateString("en-GB", { month: "short" })}</p>
                    <p className="text-xl font-bold text-[#1a3d6b] leading-none">{new Date(event.date).getDate()}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm group-hover:text-[#1a3d6b] transition-colors truncate">{event.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{event.city}, {event.country} · {event.venue}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 hidden sm:block ${CATEGORY_COLORS[event.category] || "bg-gray-100 text-gray-600"}`}>
                    {event.category}
                  </span>
                  <span className="text-lg shrink-0">{FLAG[event.country] || "🌍"}</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {allEvents.length === 0 && (
          <div className="text-center py-20 text-gray-400">No upcoming events found.</div>
        )}

        {/* Feature your event CTA */}
        <div className="mt-10 bg-[#0d1525] rounded-2xl p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-white font-bold text-lg mb-1">Running a neurotech event?</h3>
            <p className="text-[#9fcae8] text-sm">Get featured placement, newsletter inclusion, and reach 200+ industry companies.</p>
          </div>
          <Link href="/advertise" className="shrink-0 bg-[#1a3d6b] hover:bg-[#1d5ea0] text-white font-semibold px-6 py-3 rounded-xl transition-colors text-sm whitespace-nowrap">
            Feature your event →
          </Link>
        </div>
      </div>
    </div>
  );
}
