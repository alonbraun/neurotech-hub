import Link from "next/link";
import { getAllFiles } from "@/lib/content";

const CATEGORY_ICONS: Record<string, string> = {
  "Brain-Computer Interfaces": "🧠",
  "Cognitive Health": "💭",
  "Mental Health Tech": "💙",
  "Neuromodulation": "⚡",
  "Neuropharmaceuticals": "💊",
  "Neurodiagnostics": "🔬",
  "Research Tools": "🔭",
  "Neurofeedback": "📊",
  "Psychedelics": "🍄",
};

const CATEGORY_COLORS_BG: Record<string, string> = {
  "Brain-Computer Interfaces": "#1a3d6b",
  "Cognitive Health": "#2d1b69",
  "Mental Health Tech": "#1a4d5c",
  "Neuromodulation": "#4a2000",
  "Neuropharmaceuticals": "#1a4a2a",
  "Neurodiagnostics": "#4a1a2a",
  "Research Tools": "#2a3a1a",
  "Neurofeedback": "#1a2a4a",
  "Psychedelics": "#3a1a4a",
};

const NEWS_CATEGORY_COLORS: Record<string, string> = {
  Funding: "#dce8fb", Product: "#e6e0fb", Research: "#dff4f8", Policy: "#fef3d0", Industry: "#fde8f0",
};
const NEWS_CATEGORY_TEXT: Record<string, string> = {
  Funding: "#185fa5", Product: "#5c3db5", Research: "#0f6e7a", Policy: "#a06b00", Industry: "#99355a",
};
const NEWS_CATEGORY_EMOJI: Record<string, string> = {
  Funding: "💰", Product: "🚀", Research: "🔬", Policy: "📋", Industry: "🧠",
};

const AVATAR_COLORS = [
  ["#dce8fb","#185fa5"],["#e6e0fb","#5c3db5"],["#dff4f8","#0f6e7a"],
  ["#fce8e0","#993c1d"],["#f0e6fd","#6b3db5"],["#fef3d0","#a06b00"],
];

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}
function avatarColor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

export default function Home() {
  const companies = getAllFiles("companies") as any[];
  const allNews = getAllFiles("news") as any[];
  const news = allNews.slice(0, 9);
  const featured = companies.filter((c) => c.featured).slice(0, 6);
  const recentCompanies = companies.slice(0, 8);

  const categoryCounts: Record<string, number> = {};
  companies.forEach((c) => {
    if (c.category) categoryCounts[c.category] = (categoryCounts[c.category] || 0) + 1;
  });

  const fundingCompanies = companies.filter(c => c.funding && c.funding !== "Unknown" && c.funding !== "Bootstrapped").slice(0, 6);

  return (
    <>
      {/* HERO */}
      <section className="bg-[#0d1525] px-5 pt-16 pb-0 relative overflow-hidden">
        <div className="absolute inset-0" style={{backgroundImage:"radial-gradient(ellipse at 10% 50%, rgba(29,94,160,0.15) 0%, transparent 60%), radial-gradient(ellipse at 90% 20%, rgba(93,168,224,0.08) 0%, transparent 50%)"}} />

        <div className="relative max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center pb-16 pt-8">
            <div>
              <div className="inline-flex items-center gap-2 bg-[#1a3d6b]/60 border border-[#5da8e0]/20 rounded-full px-4 py-1.5 mb-6">
                <span className="w-2 h-2 rounded-full bg-[#5da8e0] animate-pulse inline-block"></span>
                <span className="text-[#9fcae8] text-xs font-semibold tracking-wider uppercase">Live industry tracker</span>
              </div>
              <h1 className="text-[clamp(2.2rem,5vw,3.6rem)] font-bold text-white leading-[1.1] tracking-tight mb-5">
                The neurotechnology<br />
                industry,{" "}
                <span className="text-[#5da8e0]">all in one place.</span>
              </h1>
              <p className="text-[#9fcae8] text-lg leading-relaxed mb-8 max-w-lg">
                {companies.length}+ companies, funding rounds, clinical trials, and breakthroughs — tracked daily for founders, investors, and researchers.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href="/directory" className="bg-[#1a3d6b] hover:bg-[#1d5ea0] text-white font-semibold px-7 py-3.5 rounded-xl transition-colors text-sm">
                  Browse directory →
                </Link>
                <Link href="/newsletter" className="border border-[#2a405a] hover:border-[#5da8e0]/40 text-[#9fcae8] hover:text-white font-medium px-7 py-3.5 rounded-xl transition-colors text-sm">
                  Get weekly digest
                </Link>
              </div>
            </div>

            {/* Live stats panel */}
            <div className="hidden lg:grid grid-cols-2 gap-3">
              {[
                { label: "Companies tracked", value: `${companies.length}+`, icon: "🏢", sub: "across 9 categories" },
                { label: "Funding tracked", value: "$18B+", icon: "💰", sub: "in VC investment" },
                { label: "News published", value: `${allNews.length * 3}+`, icon: "📰", sub: "industry articles" },
                { label: "Weekly digest", value: "Every Sunday", icon: "📬", sub: "NeuroTech Digest" },
              ].map((s) => (
                <div key={s.label} className="bg-white/5 border border-white/8 rounded-2xl p-5 backdrop-blur-sm">
                  <div className="text-2xl mb-2">{s.icon}</div>
                  <p className="text-2xl font-bold text-white">{s.value}</p>
                  <p className="text-xs font-semibold text-[#5da8e0] mt-0.5">{s.label}</p>
                  <p className="text-xs text-[#4d7a9e] mt-0.5">{s.sub}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Ticker */}
          <div className="border-t border-white/8 py-3 flex items-center gap-4 overflow-hidden">
            <span className="text-[#5da8e0] text-xs font-bold tracking-widest uppercase shrink-0 mr-2">Trending</span>
            <div className="flex gap-6 overflow-x-auto scrollbar-none">
              {companies.slice(0, 12).map((c) => (
                <Link key={c.slug} href="/directory" className="text-[#6b8fae] hover:text-[#9fcae8] text-xs whitespace-nowrap transition-colors shrink-0">
                  {c.name} <span className="text-[#2a405a]">·</span> <span className="text-[#3d6a9e]">{c.category}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORY GRID */}
      <section className="max-w-7xl mx-auto px-5 py-12">
        <div className="flex items-baseline justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Browse by category</h2>
          <Link href="/directory" className="text-sm text-[#1a3d6b] hover:underline font-medium">View all {companies.length} companies →</Link>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2">
          {Object.entries(CATEGORY_ICONS).map(([cat, icon]) => (
            <Link href="/directory" key={cat}
              className="flex flex-col items-center gap-1.5 rounded-2xl p-3 text-center transition-all group border border-gray-100 hover:border-[#1a3d6b]/20 hover:bg-[#eef5fc] hover:-translate-y-0.5">
              <span className="text-xl">{icon}</span>
              <span className="text-[10px] font-semibold text-gray-600 group-hover:text-[#1a3d6b] leading-tight">{cat}</span>
              <span className="text-[10px] text-gray-400 font-medium">{categoryCounts[cat] || 0}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* MAIN CONTENT GRID */}
      <section className="max-w-7xl mx-auto px-5 pb-12 grid lg:grid-cols-3 gap-8">

        {/* LEFT: Featured companies + recent */}
        <div className="lg:col-span-2 space-y-8">

          {/* Featured */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#1a3d6b] inline-block"></span>
                <h2 className="text-base font-bold text-gray-900 uppercase tracking-wide">Featured companies</h2>
              </div>
              <Link href="/directory" className="text-xs text-[#1a3d6b] hover:underline font-medium">View all →</Link>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {featured.map((c) => {
                const [bg, fg] = avatarColor(c.name);
                return (
                  <div key={c.slug} className="rounded-2xl p-4 border border-[#1a3d6b]/25 bg-gradient-to-br from-[#f0f7fd] to-white hover:shadow-md hover:-translate-y-0.5 transition-all">
                    <div className="flex items-center gap-3 mb-2.5">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0" style={{ background: bg, color: fg }}>
                        {initials(c.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 text-sm truncate">{c.name}</p>
                        <p className="text-[11px] text-gray-400">{c.category}</p>
                      </div>
                      <span className="ml-auto text-[10px] bg-[#1a3d6b] text-white px-2 py-0.5 rounded-full font-bold shrink-0">Featured</span>
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">{c.description}</p>
                    <div className="flex items-center gap-2 mt-2.5">
                      {c.funding && c.funding !== "Unknown" && (
                        <span className="text-[10px] bg-white text-gray-500 border border-gray-100 px-2 py-0.5 rounded-full">{c.funding}</span>
                      )}
                      {c.website && (
                        <a href={c.website} target="_blank" rel="noopener noreferrer" className="ml-auto text-xs text-[#1a3d6b] hover:underline font-medium">Visit →</a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recently added */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block"></span>
                <h2 className="text-base font-bold text-gray-900 uppercase tracking-wide">Recently added</h2>
              </div>
              <Link href="/directory" className="text-xs text-[#1a3d6b] hover:underline font-medium">Full directory →</Link>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {recentCompanies.map((c) => {
                const [bg, fg] = avatarColor(c.name);
                return (
                  <div key={c.slug} className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl p-3.5 hover:border-[#1a3d6b]/20 hover:shadow-sm transition-all">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0" style={{ background: bg, color: fg }}>
                      {initials(c.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900 text-sm truncate">{c.name}</p>
                      <p className="text-[11px] text-gray-400 truncate">{c.category} · {c.location}</p>
                    </div>
                    {c.website && (
                      <a href={c.website} target="_blank" rel="noopener noreferrer" className="text-[#1a3d6b] text-xs shrink-0 hover:underline">↗</a>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Funding spotlight */}
          {fundingCompanies.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-base">💰</span>
                  <h2 className="text-base font-bold text-gray-900 uppercase tracking-wide">Funding spotlight</h2>
                </div>
              </div>
              <div className="bg-[#0d1525] rounded-2xl p-5 grid sm:grid-cols-2 gap-3">
                {fundingCompanies.map((c) => (
                  <div key={c.slug} className="flex items-center gap-3 bg-white/5 border border-white/8 rounded-xl p-3">
                    <div className="text-lg shrink-0">🏢</div>
                    <div className="min-w-0">
                      <p className="text-white text-sm font-semibold truncate">{c.name}</p>
                      <p className="text-[#5da8e0] text-xs">{c.funding}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: News feed */}
        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse inline-block"></span>
                <h2 className="text-base font-bold text-gray-900 uppercase tracking-wide">Latest news</h2>
              </div>
              <Link href="/news" className="text-xs text-[#1a3d6b] hover:underline font-medium">All →</Link>
            </div>
            <div className="flex flex-col divide-y divide-gray-100">
              {news.slice(0, 8).map((n) => {
                const catBg = NEWS_CATEGORY_COLORS[n.category] || "#f0f0f0";
                const catFg = NEWS_CATEGORY_TEXT[n.category] || "#555";
                const emoji = NEWS_CATEGORY_EMOJI[n.category] || "🧠";
                return (
                  <div key={n.slug} className="py-3.5 first:pt-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-sm">{emoji}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: catBg, color: catFg }}>{n.category}</span>
                      <span className="text-[10px] text-gray-400 ml-auto">{n.date}</span>
                    </div>
                    <Link href={`/news/${n.slug}`} className="text-sm font-semibold text-gray-900 hover:text-[#1a3d6b] leading-snug transition-colors line-clamp-2 block">
                      {n.title}
                    </Link>
                    {n.excerpt && <p className="text-xs text-gray-500 mt-1 line-clamp-1">{n.excerpt}</p>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Newsletter CTA sidebar */}
          <div className="bg-[#0d1525] rounded-2xl p-5">
            <p className="text-[#5da8e0] text-xs font-bold tracking-widest uppercase mb-2">Every Sunday</p>
            <h3 className="text-white font-bold text-base mb-2">The NeuroTech Digest</h3>
            <p className="text-[#9fcae8] text-xs leading-relaxed mb-4">Funding rounds, breakthroughs, and top jobs — curated weekly for industry professionals.</p>
            <Link href="/newsletter" className="block text-center bg-[#1a3d6b] hover:bg-[#1d5ea0] text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition-colors">
              Subscribe free →
            </Link>
          </div>

          {/* Advertise CTA */}
          <div className="border border-[#1a3d6b]/20 rounded-2xl p-5 bg-[#f0f7fd]">
            <p className="text-[#1a3d6b] text-xs font-bold tracking-widest uppercase mb-2">For companies</p>
            <h3 className="text-gray-900 font-bold text-sm mb-1.5">Reach neurotech decision-makers</h3>
            <p className="text-gray-500 text-xs leading-relaxed mb-3">Premium listings, newsletter sponsorships, and featured placements.</p>
            <Link href="/advertise" className="block text-center border border-[#1a3d6b] text-[#1a3d6b] hover:bg-[#1a3d6b] hover:text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition-colors">
              View packages →
            </Link>
          </div>
        </div>
      </section>

      {/* NEWS GRID */}
      {news.length > 3 && (
        <section className="bg-gray-50 border-t border-gray-100 py-14">
          <div className="max-w-7xl mx-auto px-5">
            <div className="flex items-baseline justify-between mb-8">
              <h2 className="text-xl font-bold text-gray-900">News & insights</h2>
              <Link href="/news" className="text-sm text-[#1a3d6b] hover:underline font-medium">All articles →</Link>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {news.slice(0, 6).map((n) => {
                const catBg = NEWS_CATEGORY_COLORS[n.category] || "#f0f0f0";
                const catFg = NEWS_CATEGORY_TEXT[n.category] || "#555";
                const emoji = NEWS_CATEGORY_EMOJI[n.category] || "🧠";
                return (
                  <Link key={n.slug} href={`/news/${n.slug}`}
                    className="bg-white rounded-2xl overflow-hidden border border-gray-100 hover:border-[#1a3d6b]/20 hover:-translate-y-0.5 hover:shadow-md transition-all group">
                    <div className="h-24 flex items-center justify-center text-4xl font-bold relative overflow-hidden" style={{ background: catBg }}>
                      <span className="opacity-30 text-6xl absolute">{emoji}</span>
                      <span className="relative z-10 text-3xl">{emoji}</span>
                    </div>
                    <div className="p-4">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: catBg, color: catFg }}>{n.category || "Industry"}</span>
                      <h3 className="mt-2 text-sm font-bold text-gray-900 leading-snug line-clamp-2 group-hover:text-[#1a3d6b] transition-colors">{n.title}</h3>
                      {n.excerpt && <p className="mt-1.5 text-xs text-gray-500 line-clamp-2 leading-relaxed">{n.excerpt}</p>}
                      <p className="mt-2.5 text-[10px] text-gray-400 font-medium">{n.date}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* STATS BAND */}
      <section className="bg-[#0d1525] py-16 px-5">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
            {[
              { val: `${companies.length}+`, label: "Companies", sub: "across 9 sectors", icon: "🏢" },
              { val: "$18B+", label: "VC Invested", sub: "tracked in our database", icon: "💰" },
              { val: "3×/week", label: "News published", sub: "Mon · Wed · Fri", icon: "📰" },
              { val: `${allNews.length}+`, label: "Articles", sub: "in our archive", icon: "📚" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-3xl mb-2">{s.icon}</div>
                <p className="text-3xl md:text-4xl font-bold text-white">{s.val}</p>
                <p className="text-[#5da8e0] text-sm font-semibold mt-1">{s.label}</p>
                <p className="text-[#3d6a9e] text-xs mt-0.5">{s.sub}</p>
              </div>
            ))}
          </div>

          {/* Category breakdown */}
          <div className="border-t border-white/8 pt-10">
            <p className="text-[#5da8e0] text-xs font-bold tracking-widest uppercase mb-6 text-center">Companies by sector</p>
            <div className="grid grid-cols-3 md:grid-cols-9 gap-3">
              {Object.entries(CATEGORY_ICONS).map(([cat, icon]) => {
                const count = categoryCounts[cat] || 0;
                const maxCount = Math.max(...Object.values(categoryCounts));
                const pct = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0;
                return (
                  <div key={cat} className="text-center">
                    <div className="text-xl mb-1">{icon}</div>
                    <div className="h-1 bg-white/10 rounded-full mb-1.5 overflow-hidden">
                      <div className="h-full bg-[#5da8e0] rounded-full" style={{ width: `${pct}%` }}></div>
                    </div>
                    <p className="text-white text-sm font-bold">{count}</p>
                    <p className="text-[#3d6a9e] text-[9px] leading-tight mt-0.5">{cat.split(" ")[0]}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* NEWSLETTER */}
      <section className="max-w-7xl mx-auto px-5 py-16">
        <div className="bg-gradient-to-br from-[#0d1525] to-[#1a3d6b] rounded-3xl p-10 md:p-14 text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-5" style={{backgroundImage:"radial-gradient(circle at 20% 50%, #5da8e0 0%, transparent 50%), radial-gradient(circle at 80% 30%, #fff 0%, transparent 40%)"}} />
          <div className="relative">
            <span className="inline-block text-[#5da8e0] text-xs font-bold tracking-[3px] uppercase mb-4">Every Sunday</span>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3 leading-tight">The NeuroTech Digest</h2>
            <p className="text-[#9fcae8] text-base leading-relaxed mb-8 max-w-xl mx-auto">
              Funding rounds, product launches, research breakthroughs, and the best jobs — curated weekly for the neurotech industry.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input type="email" placeholder="your@email.com"
                className="flex-1 bg-white/10 border border-white/20 text-white placeholder-white/40 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#5da8e0]/60" />
              <Link href="/newsletter" className="bg-[#5da8e0] hover:bg-[#7bbce8] text-[#0d1525] text-sm font-bold px-6 py-3 rounded-xl transition-colors whitespace-nowrap">
                Subscribe free
              </Link>
            </div>
            <p className="mt-4 text-[#3d6a9e] text-xs">No spam. Unsubscribe anytime.</p>
          </div>
        </div>
      </section>
    </>
  );
}
