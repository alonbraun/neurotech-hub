import { getAllFiles } from "@/lib/content";
import Link from "next/link";
import fs from "fs";
import path from "path";
import EventsClient from "./EventsClient";

export const metadata = {
  title: "Neurotech Events — NeuroTech.com",
  description: "Upcoming neurotechnology conferences, meetups, and industry events worldwide.",
};

export const revalidate = 3600;

// Keywords that must appear in event name to be considered neurotech-relevant
const RELEVANT_KEYWORDS = [
  "neuro", "brain", "bci", "cognit", "psychedel", "mental health",
  "neurofeed", "neurostim", "neuromodu", "neural", "mind", "consciousness",
  "alzheimer", "parkinson", "epilep", "eeg", "tms", "dbs",
];

function isRelevant(name: string) {
  const n = name.toLowerCase();
  return RELEVANT_KEYWORDS.some((kw) => n.includes(kw));
}

export default function EventsPage() {
  const today = new Date().toISOString().split("T")[0];

  // Curated conferences from markdown (always relevant)
  const curated = (getAllFiles("events") as any[])
    .filter((e) => e.date >= today)
    .map((e) => ({ ...e, category: e.category || "Conference", website: e.website }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Eventbrite events — filter for relevance
  let ebEvents: any[] = [];
  try {
    const ebPath = path.join(process.cwd(), "content/events/eventbrite.json");
    if (fs.existsSync(ebPath)) {
      ebEvents = JSON.parse(fs.readFileSync(ebPath, "utf8"))
        .filter((e: any) => e.date >= today && isRelevant(e.name))
        .map((e: any) => ({
          ...e,
          category: "Meetup",
          website: e.url,
        }));
    }
  } catch (_) {}

  const allEvents = [...curated, ...ebEvents].sort((a, b) => a.date.localeCompare(b.date));

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

      <EventsClient events={allEvents} />

      {/* CTA */}
      <div className="max-w-6xl mx-auto px-5 pb-12">
        <div className="bg-[#0d1525] rounded-2xl p-7 flex flex-col sm:flex-row items-center justify-between gap-5">
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
