"use client";
import { useState } from "react";

const CATEGORIES = ["All", "Brain-Computer Interfaces", "Cognitive Health", "Mental Health Tech", "Neuromodulation", "Neuropharmaceuticals", "Neurodiagnostics", "Research Tools", "Neurofeedback", "Psychedelics"];

const AVATAR_COLORS = [
  ["#dce8fb", "#185fa5"],
  ["#e6e0fb", "#5c3db5"],
  ["#dff4f8", "#0f6e7a"],
  ["#fce8e0", "#993c1d"],
  ["#f0e6fd", "#6b3db5"],
  ["#fef3d0", "#a06b00"],
];

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}
function avatarColor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

export default function DirectoryClient({ companies }: { companies: any[] }) {
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");

  const filtered = companies.filter((c) => {
    const matchCat = activeCategory === "All" || c.category === activeCategory;
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || (c.description || "").toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const premium = filtered.filter((c) => c.tier === "premium");
  const free = filtered.filter((c) => c.tier !== "premium");

  return (
    <>
      <section className="bg-[#0d1525] px-5 py-16 md:py-20">
        <div className="max-w-7xl mx-auto">
          <span className="text-[#5da8e0] text-xs font-semibold tracking-[3px] uppercase">NeuroTech Directory</span>
          <h1 className="text-4xl md:text-5xl font-semibold text-white mt-4 mb-3 leading-tight">
            The most comprehensive<br className="hidden md:block" /> neurotech company database
          </h1>
          <p className="text-[#9fcae8] text-lg max-w-2xl">
            {companies.length} companies across BCIs, cognitive health, neuromodulation, psychedelics, and more — updated weekly by our AI research agent.
          </p>
          <div className="mt-6 max-w-md">
            <input
              type="text"
              placeholder="Search companies..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/10 border border-white/15 text-white placeholder-white/40 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#5da8e0]/50"
            />
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-5 py-10">
        <div className="flex flex-wrap gap-2 mb-10">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`text-sm px-4 py-1.5 rounded-full border transition-colors font-medium cursor-pointer ${
                activeCategory === cat
                  ? "bg-[#1a3d6b] text-white border-[#1a3d6b]"
                  : "border-gray-200 text-gray-600 hover:border-[#1a3d6b] hover:text-[#1a3d6b] hover:bg-[#eef5fc]"
              }`}
            >
              {cat}
              {cat !== "All" && (
                <span className={`ml-1.5 text-xs ${activeCategory === cat ? "text-white/70" : "text-gray-400"}`}>
                  {companies.filter((c) => c.category === cat).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400 text-lg">No companies found.</p>
            <button onClick={() => { setActiveCategory("All"); setSearch(""); }} className="mt-4 text-sm text-[#1a3d6b] hover:underline">
              Clear filters
            </button>
          </div>
        ) : (
          <>
            {premium.length > 0 && (
              <div className="mb-12">
                <h2 className="text-xs font-bold tracking-widest text-[#1a3d6b] uppercase mb-5">Featured partners</h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {premium.map((c) => {
                    const [bg, fg] = avatarColor(c.name);
                    return (
                      <div key={c.slug} className="rounded-2xl p-6 bg-[#f0f7fd] border border-[#1a3d6b]/25 hover:-translate-y-0.5 hover:shadow-md transition-all">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-11 h-11 rounded-xl flex items-center justify-center text-sm font-semibold" style={{ background: bg, color: fg }}>
                            {initials(c.name)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900">{c.name}</p>
                            <p className="text-xs text-gray-500">{c.category} · {c.location}</p>
                          </div>
                          <span className="text-xs bg-[#1a3d6b] text-white px-2.5 py-1 rounded-full font-medium shrink-0">Featured</span>
                        </div>
                        <p className="text-sm text-gray-700 leading-relaxed">{c.description}</p>
                        <div className="flex items-center gap-2 mt-4">
                          {c.funding && c.funding !== "Unknown" && (
                            <span className="text-xs text-gray-500 bg-white border border-gray-100 px-2 py-0.5 rounded-full">{c.funding}</span>
                          )}
                          {c.website && (
                            <a href={c.website} target="_blank" rel="noopener noreferrer" className="ml-auto text-sm font-medium text-[#1a3d6b] hover:underline">
                              Visit →
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {premium.length > 0 && free.length > 0 && (
              <h2 className="text-xs font-bold tracking-widest text-gray-400 uppercase mb-5">All companies</h2>
            )}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {free.map((c) => {
                const [bg, fg] = avatarColor(c.name);
                return (
                  <div key={c.slug} className="rounded-2xl p-5 bg-white border border-gray-100 hover:border-[#1a3d6b]/20 hover:-translate-y-0.5 hover:shadow-sm transition-all">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-semibold flex-shrink-0" style={{ background: bg, color: fg }}>
                        {initials(c.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 text-sm truncate">{c.name}</p>
                        <p className="text-xs text-gray-400">{c.category}</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed line-clamp-2">{c.description}</p>
                    <div className="flex items-center mt-3 gap-2">
                      {c.location && <span className="text-xs text-gray-400">{c.location}</span>}
                      {c.website && (
                        <a href={c.website} target="_blank" rel="noopener noreferrer" className="ml-auto text-xs text-[#1a3d6b] hover:underline shrink-0">
                          Visit →
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        <div className="mt-14 bg-[#0d1525] rounded-3xl p-10 text-center">
          <h3 className="text-2xl font-semibold text-white mb-3">Is your company listed?</h3>
          <p className="text-[#9fcae8] mb-6 max-w-md mx-auto">Add a free basic listing or upgrade to Premium for a full profile, featured badge, and priority ranking.</p>
          <a href="/advertise" className="bg-[#1a3d6b] hover:bg-[#1d5ea0] text-white font-medium px-6 py-3 rounded-xl transition-colors inline-block">
            Get listed or upgrade
          </a>
        </div>
      </div>
    </>
  );
}
