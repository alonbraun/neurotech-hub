import { getAllFiles } from "@/lib/content";
import Link from "next/link";
import NewsImage from "@/components/NewsImage";

export const metadata = {
  title: "NeuroTech News & Insights — NeuroTech.com",
  description: "The latest news, funding rounds, and insights from the neurotechnology industry.",
};

const CATEGORY_COLORS: Record<string, string> = { Funding: "#dce8fb", Product: "#e6e0fb", Research: "#dff4f8", Policy: "#fef3d0", Industry: "#fde8f0" };
const CATEGORY_TEXT: Record<string, string> = { Funding: "#185fa5", Product: "#5c3db5", Research: "#0f6e7a", Policy: "#a06b00", Industry: "#99355a" };

// Curated Unsplash photo IDs relevant to neurotech
const CATEGORY_IMAGES: Record<string, string[]> = {
  Funding:  ["1559523182-a284dc3b7f96","1444653614773-995cb1ef9efa","1611974789855-9c2a0a7236a3"],
  Product:  ["1576086213369-97a306d36557","1614974488824-af01a3b3c5a9","1532094349600-8bd85fb9e1c3"],
  Research: ["1559757148-5c350d0d3c56","1510915361894-db8b60106cb1","1554475901-4538ddfbccc2"],
  Policy:   ["1589829545856-d10d557cf95f","1453749024858-4bca89bd9edc","1507003211169-0a1dd7228f2d"],
  Industry: ["1581092160607-ee67df5e8b42","1504639725590-34d0984388bd","1555664496-1a98040dc2f4"],
};
const FALLBACK_IMAGES = ["1559757148-5c350d0d3c56","1576086213369-97a306d36557","1510915361894-db8b60106cb1","1614974488824-af01a3b3c5a9"];

function getArticleImage(article: any): string {
  if (article.image) return article.image;
  const pool = CATEGORY_IMAGES[article.category] || FALLBACK_IMAGES;
  // deterministic pick based on slug
  const idx = article.slug.split("").reduce((acc: number, c: string) => acc + c.charCodeAt(0), 0) % pool.length;
  return `https://images.unsplash.com/photo-${pool[idx]}?w=900&q=80&auto=format&fit=crop`;
}

export default function NewsPage() {
  const articles = getAllFiles("news") as any[];
  const [lead, ...rest] = articles;

  return (
    <>
      <section className="bg-[#0d1525] px-5 py-16 md:py-20">
        <div className="max-w-7xl mx-auto">
          <span className="text-[#5da8e0] text-xs font-semibold tracking-[3px] uppercase">News & Insights</span>
          <h1 className="text-4xl md:text-5xl font-semibold text-white mt-4 mb-3 leading-tight">Neurotech industry news</h1>
          <p className="text-[#9fcae8] text-lg max-w-2xl">Funding rounds, product launches, research findings, and policy updates — published 3× per week.</p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-5 py-12">
        {articles.length > 0 ? (
          <>
            {lead && (
              <Link href={`/news/${lead.slug}`} className="group block mb-12 rounded-3xl overflow-hidden border border-gray-100 hover:border-[#1a3d6b]/20 hover:shadow-lg transition-all">
                <div className="h-52 md:h-64 overflow-hidden relative">
                  <NewsImage src={getArticleImage(lead)} alt={lead.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  {lead.category && <span className="absolute top-4 left-4 text-xs font-bold px-3 py-1 rounded-full" style={{ background: CATEGORY_COLORS[lead.category] || "#f0f0f0", color: CATEGORY_TEXT[lead.category] || "#555" }}>{lead.category}</span>}
                </div>
                <div className="p-8 bg-white">
                  <h2 className="text-2xl md:text-3xl font-semibold text-gray-900 leading-snug group-hover:text-[#1a3d6b] transition-colors">{lead.title}</h2>
                  {lead.excerpt && <p className="mt-3 text-gray-500 text-base leading-relaxed max-w-2xl">{lead.excerpt}</p>}
                  <p className="mt-4 text-sm text-gray-400">{lead.date}</p>
                </div>
              </Link>
            )}
            {rest.length > 0 && (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {rest.map((a) => (
                  <Link key={a.slug} href={`/news/${a.slug}`} className="group bg-white rounded-2xl overflow-hidden border border-gray-100 hover:border-[#1a3d6b]/20 hover:-translate-y-0.5 hover:shadow-md transition-all">
                    <div className="h-36 overflow-hidden relative">
                      <img src={getArticleImage(a)} alt={a.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      {a.category && <span className="absolute top-2.5 left-2.5 text-xs font-bold px-2.5 py-0.5 rounded-full" style={{ background: CATEGORY_COLORS[a.category] || "#f0f0f0", color: CATEGORY_TEXT[a.category] || "#555" }}>{a.category}</span>}
                    </div>
                    <div className="p-5">
                      <h3 className="mt-2 text-sm font-semibold text-gray-900 leading-snug line-clamp-3 group-hover:text-[#1a3d6b] transition-colors">{a.title}</h3>
                      {a.excerpt && <p className="mt-1.5 text-xs text-gray-500 line-clamp-2 leading-relaxed">{a.excerpt}</p>}
                      <p className="mt-3 text-xs text-gray-400">{a.date}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-28">
            <div className="text-6xl mb-6">🧠</div>
            <p className="text-xl font-semibold text-gray-900 mb-2">News publishing starts soon</p>
            <p className="text-gray-500 mb-8">Subscribe to the newsletter to get notified when the first issue drops.</p>
            <Link href="/newsletter" className="bg-[#1a3d6b] text-white px-6 py-3 rounded-xl font-medium hover:bg-[#0f2448] transition-colors">Subscribe</Link>
          </div>
        )}

        <div className="mt-16 bg-[#0d1525] rounded-3xl p-8 md:p-10 flex flex-col md:flex-row items-center gap-6">
          <div className="flex-1">
            <p className="text-[#5da8e0] text-xs font-bold tracking-widest uppercase mb-2">Sponsored content</p>
            <h3 className="text-xl font-semibold text-white mb-2">Reach neurotech decision-makers with your story</h3>
            <p className="text-[#9fcae8] text-sm">Sponsored articles appear in the News feed and the weekly newsletter. $1,500/article.</p>
          </div>
          <Link href="/advertise" className="shrink-0 bg-[#1a3d6b] hover:bg-[#1d5ea0] text-white font-medium px-6 py-3 rounded-xl transition-colors">Learn more →</Link>
        </div>
      </div>
    </>
  );
}
