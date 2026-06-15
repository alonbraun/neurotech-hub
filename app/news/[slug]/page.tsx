import { getFileBySlug, getFiles } from "@/lib/content";
import { notFound } from "next/navigation";
import Link from "next/link";

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
      <p className="text-sm text-gray-400 mt-3">{article.date}</p>
      {article.sponsored && <p className="mt-2 text-xs bg-yellow-50 text-yellow-700 px-3 py-1 rounded-full inline-block">Sponsored content</p>}
      <div className="mt-8 prose prose-gray max-w-none text-gray-700 leading-relaxed">
        {article.content.split('\n').map((p: string, i: number) => p.trim() && <p key={i}>{p}</p>)}
      </div>
    </div>
  );
}
