import { getFileBySlug, getFiles } from "@/lib/content";
import { notFound } from "next/navigation";
import Link from "next/link";
import NewsImage from "@/components/NewsImage";

export async function generateStaticParams() {
  return getFiles("news").map((f) => ({ slug: f.replace(".md", "") }));
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = getFileBySlug("news", slug) as any;
  if (!article) notFound();

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <Link href="/news" className="text-sm text-gray-400 hover:text-gray-600 mb-6 inline-block">← All news</Link>
      {article.category && <span className="text-xs font-semibold tracking-widest text-[#1a3d6b] uppercase block mb-2">{article.category}</span>}
      <h1 className="text-3xl font-bold text-gray-900 leading-snug">{article.title}</h1>
      {article.image && (
        <div className="mt-6 rounded-2xl overflow-hidden">
          <NewsImage src={article.image} alt={article.title} className="w-full h-56 md:h-72 object-cover" />
        </div>
      )}
      <p className="text-sm text-gray-400 mt-3">{article.date}</p>
      {article.sponsored && <p className="mt-2 text-xs bg-yellow-50 text-yellow-700 px-3 py-1 rounded-full inline-block">Sponsored content</p>}
      <div className="mt-8 max-w-none text-gray-700 leading-relaxed space-y-5">
        {article.content.split('\n').filter((p: string) => p.trim()).map((p: string, i: number) => {
          // H2 heading: ## text
          if (p.startsWith('## ')) return <h2 key={i} className="text-xl font-bold text-gray-900 mt-8 mb-2">{p.slice(3)}</h2>;
          // H3 heading: ### text  or a short line with no punctuation at the end (section title)
          if (p.startsWith('### ')) return <h3 key={i} className="text-lg font-semibold text-gray-900 mt-6 mb-1">{p.slice(4)}</h3>;
          // Numbered list items: "1. text"
          if (/^\d+\.\s/.test(p)) return <p key={i} className="pl-4 border-l-2 border-[#5da8e0] text-gray-700"><strong>{p.match(/^\d+\./)?.[0]}</strong> {p.replace(/^\d+\.\s/, '')}</p>;
          // Lines that look like sub-headings: short, no period at end, could be bold
          if (p.length < 80 && !p.endsWith('.') && !p.endsWith(',') && !p.startsWith('-') && !/^[a-z]/.test(p)) {
            return <h3 key={i} className="text-base font-bold text-gray-900 mt-7 mb-1">{p}</h3>;
          }
          // Inline bold **text** and italic *text*
          const rendered = p
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.+?)\*/g, '<em>$1</em>');
          return <p key={i} className="text-gray-700 leading-7" dangerouslySetInnerHTML={{ __html: rendered }} />;
        })}
      </div>
    </div>
  );
}
