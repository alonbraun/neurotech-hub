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
  const idx = name.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

const CATEGORY_COLORS: Record<string, string> = {
  Funding: "#dce8fb",
  Product: "#e6e0fb",
  Research: "#dff4f8",
  Policy: "#fef3d0",
  Industry: "#fde8f0",
};

const CATEGORY_TEXT: Record<string, string> = {
  Funding: "#185fa5",
  Product: "#5c3db5",
  Research: "#0f6e7a",
  Policy: "#a06b00",
  Industry: "#99355a",
};

export default function Home() {
  const companies = getAllFiles("companies") as any[];
  const news = (getAllFiles("news") as any[]).slice(0, 6);
  const jobs = (getAllFiles("jobs") as any[]).slice(0, 4);
  const featured = companies.filter((c) => c.featured).slice(0, 6);
  const displayCompanies = featured.length > 0 ? featured : companies.slice(0, 6);

  const categoryCounts: Record<string, number> = {};
  companies.forEach((c) => {
    if (c.category) categoryCounts[c.category] = (categoryCounts[c.category] || 0) + 1;
  });
  const topCategories = Object.entries(CATEGORY_ICONS).slice(0, 8);

  return (
    <>
      <section className="bg-[#0d1525] px-5 pt-20 pb-24 md:pt-28 md:pb-32 text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{backgroundImage:"radial-gradient(circle at 20% 50%, #5da8e0 0%, transparent 50%), radial-gradient(circle at 80% 20%, #1a3d6b 0%, transparent 50%)"}} />
        <div className="relative max-w-4xl mx-auto">
          <span className="inline-block text-[#5da8e0] text-xs font-semibold tracking-[3px] uppercase mb-5">
            The Industry Hub
          </span>
          <h1 className="text-[clamp(2.4rem,6vw,4rem)] font-semibold text-white leading-[1.12] tracking-tight mb-6">
            Neurotechnology,<br />
            <span className="text-[#5da8e0]">all in one place.</span>
          </h1>
          <p className="text-[#9fcae8] text-lg md:text-xl leading-relaxed max-w-2xl mx-auto mb-10">
            The definitive resource for neurotech companies, investors, researchers, and clinicians worldwide. {companies.length > 0 ? `${companies.length}+ companies listed` : "Hundreds of companies"}, news published 3× per week, and the best jobs in neurotechnology.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/directory" className="bg-[#1a3d6b] hover:bg-[#1d5ea0] text-white text-base font-medium px-8 py-3.5 rounded-xl transition-colors">
              Browse directory →
            </Link>
            <Link href="/newsletter" className="border border-[#2a405a] text-[#9fcae8] hover:bg-white/5 text-base font-medium px-8 py-3.5 rounded-xl transition-colors">
              Get weekly digest
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-[#0a1020] border-y border-white/5 py-5">
        <div className="max-w-7xl mx-auto px-5 grid grid-cols-2 md:grid-cols-4 gap-0 divide-x divide-white/5">
          {[
            [companies.length > 0 ? `${companies.length}+` : "20+", "Companies listed"],
            ["3×/week", "Industry news"],
            ["$3.2B+", "VC invested in 2024"],
            ["Every Sunday", "NeuroTech Digest"],
          ].map(([val, label]) => (
            <div key={label} className="px-6 py-3 text-center">
              <p className="text-[#5da8e0] text-2xl md:text-3xl font-semibold">{val}</p>
              <p className="text-[#4d7a9e] text-xs mt-1">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-5 py-16">
        <div className="flex items-baseline justify-between mb-8">
          <h2 className="text-2xl font-semibold text-gray-900">Browse by category</h2>
          <Link href="/directory" className="text-sm text-[#1a3d6b] hover:underline">All companies →</Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {topCategories.map(([cat, icon]) => (
            <Link href="/directory" key={cat}
              className="flex flex-col items-center gap-2 bg-gray-50 hover:bg-[#eef5fc] border border-gray-100 hover:border-[#1a3d6b]/20 rounded-2xl p-4 text-center transition-all group">
              <span className="text-2xl">{icon}</span>
              <span className="text-xs font-medium text-gray-700 group-hover:text-[#1a3d6b] leading-snug">{cat}</span>
              {categoryCounts[cat] > 0 && (
                <span className="text-xs text-gray-400">{categoryCounts[cat]}</span>
              )}
            </Link>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-5 pb-16 grid lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2">
          <div className="flex items-baseline justify-between mb-6">
            <h2 className="text-2xl font-semibold text-gray-900">Featured companies</h2>
            <Link href="/directory" className="text-sm text-[#1a3d6b] hover:underline">View all →</Link>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {displayCompanies.map((c) => {
              const [bg, fg] = avatarColor(c.name);
              return (
                <div key={c.slug}
                  className={`rounded-2xl p-5 border transition-all hover:-translate-y-0.5 hover:shadow-md ${c.featured ? "border-[#1a3d6b]/30 bg-[#f0f7fd]" : "border-gray-100 bg-white hover:border-[#1a3d6b]/20"}`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-semibold flex-shrink-0"
                      style={{ background: bg, color: fg }}>
                      {initials(c.name)}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{c.name}</p>
                      <p className="text-xs text-gray-400">{c.category}</p>
                    </div>
                    {c.featured && (
                      <span className="ml-auto text-xs bg-[#eef5fc] text-[#1a3d6b] px-2 py-0.5 rounded-full font-medium">Featured</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed line-clamp-2">{c.description}</p>
                  <div className="flex items-center gap-2 mt-3">
                    {c.funding && c.funding !== "Unknown" && (
                      <span className="text-xs bg-gray-50 text-gray-500 border border-gray-100 px-2 py-0.5 rounded-full">{c.funding}</span>
                    )}
                    {c.website && (
                      <a href={c.website} target="_blank" rel="noopener noreferrer"
                        className="ml-auto text-xs text-[#1a3d6b] hover:underline">
                        Visit →
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-10">
          <div>
            <div className="flex items-baseline justify-between mb-5">
              <h2 className="text-xl font-semibold text-gray-900">Latest news</h2>
              <Link href="/news" className="text-sm text-[#1a3d6b] hover:underline">All →</Link>
            </div>
            {news.length > 0 ? (
              <div className="flex flex-col gap-0 divide-y divide-gray-100">
                {news.slice(0, 4).map((n) => {
                  const catBg = CATEGORY_COLORS[n.category] || "#f3f3f3";
                  const catFg = CATEGORY_TEXT[n.category] || "#555";
                  return (
                    <div key={n.slug} className="py-4 first:pt-0">
                      {n.category && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full mr-2"
                          style={{ background: catBg, color: catFg }}>
                          {n.category}
                        </span>
                      )}
                      <Link href={`/news/${n.slug}`}
                        className="block mt-1.5 text-sm font-medium text-gray-900 hover:text-[#1a3d6b] leading-snug transition-colors">
                        {n.title}
                      </Link>
                      <p className="text-xs text-gray-400 mt-1">{n.date}</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-400">News publishing starts soon.</p>
            )}
          </div>

          <div>
            <div className="flex items-baseline justify-between mb-5">
              <h2 className="text-xl font-semibold text-gray-900">Open jobs</h2>
              <Link href="/jobs" className="text-sm text-[#1a3d6b] hover:underline">All →</Link>
            </div>
            {jobs.length > 0 ? (
              <div className="flex flex-col gap-0 divide-y divide-gray-100">
                {jobs.map((j) => (
                  <div key={j.slug} className="py-3 first:pt-0">
                    <p className="text-sm font-medium text-gray-900">{j.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{j.company} · {j.location}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <p className="text-sm text-gray-500">Post the first neurotech job</p>
                <Link href="/advertise#job-posting" className="mt-2 inline-block text-xs font-medium text-[#1a3d6b] hover:underline">$250 / 30 days →</Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {news.length > 3 && (
        <section className="bg-gray-50 border-t border-gray-100 py-16">
          <div className="max-w-7xl mx-auto px-5">
            <div className="flex items-baseline justify-between mb-8">
              <h2 className="text-2xl font-semibold text-gray-900">News & insights</h2>
              <Link href="/news" className="text-sm text-[#1a3d6b] hover:underline">All articles →</Link>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {news.slice(0, 6).map((n) => {
                const catBg = CATEGORY_COLORS[n.category] || "#f0f0f0";
                const catFg = CATEGORY_TEXT[n.category] || "#555";
                return (
                  <Link key={n.slug} href={`/news/${n.slug}`}
                    className="bg-white rounded-2xl overflow-hidden border border-gray-100 hover:border-[#1a3d6b]/20 hover:-translate-y-0.5 hover:shadow-md transition-all group">
                    <div className="h-28 flex items-center justify-center text-4xl" style={{ background: catBg }}>
                      {n.category === "Funding" ? "💰" : n.category === "Product" ? "🚀" : n.category === "Research" ? "🔬" : n.category === "Policy" ? "📋" : "🧠"}
                    </div>
                    <div className="p-5">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: catBg, color: catFg }}>{n.category || "Industry"}</span>
                      <h3 className="mt-2.5 text-sm font-semibold text-gray-900 leading-snug line-clamp-2 group-hover:text-[#1a3d6b] transition-colors">{n.title}</h3>
                      {n.excerpt && <p className="mt-1.5 text-xs text-gray-500 line-clamp-2 leading-relaxed">{n.excerpt}</p>}
                      <p className="mt-3 text-xs text-gray-400">{n.date}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <section className="bg-[#0d1525] py-20 px-5">
        <div className="max-w-2xl mx-auto text-center">
          <span className="inline-block text-[#5da8e0] text-xs font-semibold tracking-[3px] uppercase mb-4">Every Sunday</span>
          <h2 className="text-3xl md:text-4xl font-semibold text-white mb-4 leading-tight">The NeuroTech Digest</h2>
          <p className="text-[#9fcae8] text-base leading-relaxed mb-8">
            Funding rounds, product launches, research breakthroughs, and the best jobs — curated weekly for the neurotech industry.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input type="email" placeholder="your@email.com"
              className="flex-1 bg-white/10 border border-white/15 text-white placeholder-white/40 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#5da8e0]/50" />
            <Link href="/newsletter" className="bg-[#1a3d6b] hover:bg-[#1d5ea0] text-white text-sm font-medium px-6 py-3 rounded-xl transition-colors whitespace-nowrap">
              Subscribe free
            </Link>
          </div>
          <p className="mt-4 text-[#3d6a9e] text-xs">No spam. Unsubscribe anytime.</p>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-5 py-16">
        <div className="bg-[#f0f7fd] border border-[#1a3d6b]/15 rounded-3xl p-10 md:p-14 text-center">
          <h2 className="text-3xl font-semibold text-gray-900 mb-3">Reach the neurotech industry</h2>
          <p className="text-gray-500 text-lg max-w-xl mx-auto mb-8">
            Founders, investors, and researchers read NeuroTech.com. Premium listings, newsletter sponsorships, and featured placements available.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/advertise" className="bg-[#1a3d6b] hover:bg-[#0f2448] text-white font-medium px-8 py-3.5 rounded-xl transition-colors">
              View advertising options
            </Link>
            <Link href="/directory" className="border border-[#1a3d6b] text-[#1a3d6b] hover:bg-[#eef5fc] font-medium px-8 py-3.5 rounded-xl transition-colors">
              List your company free
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
