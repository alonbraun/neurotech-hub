import { getAllFiles } from "@/lib/content";
import Link from "next/link";

export const metadata = {
  title: "NeuoTech Jobs — NeuoTech.com",
  description: "The best jobs in neurotechnology — BCIs, cognitive health, neuromodulation, and more.",
};

export default function JobsPage() {
  const jobs = getAllFiles("jobs") as any[];

  return (
    <>
      <section className="bg-[#0d1525] px-5 py-16 md:py-20">
        <div className="max-w-7xl mx-auto">
          <span className="text-[#5da8e0] text-xs font-semibold tracking-[3px] uppercase">NeuoTech Jobs</span>
          <h1 className="text-4xl md:text-5xl font-semibold text-white mt-4 mb-3 leading-tight">Jobs in neurotechnology</h1>
          <p className="text-[#9fcae8] text-lg max-w-2xl">Find your next role at the companies building the future of neurotechnology.</p>
        </div>
      </section>
      <div className="max-w-4xl mx-auto px-5 py-12">
        {jobs.length > 0 ? (
          <div className="flex flex-col gap-3">
            {jobs.map((j) => (
              <div key={j.slug} className="bg-white border border-gray-100 rounded-2xl p-5 hover:border-[#1a3d6b]/20 hover:shadow-sm transition-all">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-semibold text-gray-900">{j.title}</h2>
                    <p className="text-sm text-gray-500 mt-0.5">{j.company} · {j.location}</p>
                    {j.description && <p className="mt-2 text-sm text-gray-600 leading-relaxed">{j.description}</p>}
                  </div>
                  {j.apply_url && (
                    <a href={j.apply_url} target="_blank" rel="noopener noreferrer"
                      className="shrink-0 bg-[#1a3d6b] text-white text-xs font-medium px-4 py-2 rounded-lg hover:bg-[#0f2448] transition-colors">Apply</a>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-28">
            <div className="text-6xl mb-6">🔭</div>
            <p className="text-xl font-semibold text-gray-900 mb-2">No jobs posted yet</p>
            <p className="text-gray-500 mb-8">Be the first to reach neurotech talent.</p>
            <Link href="/advertise#job-posting" className="bg-[#1a3d6b] text-white px-6 py-3 rounded-xl font-medium hover:bg-[#0f2448] transition-colors">Post a job — $250</Link>
          </div>
        )}
        <div className="mt-12 bg-[#eef5fc] border border-[#1a3d6b]/15 rounded-2xl p-8 text-center">
          <h3 className="font-semibold text-gray-900 mb-2">Hiring in neurotech?</h3>
          <p className="text-gray-500 text-sm mb-4">Post a 30-day job listing. Included in the next 2 newsletter issues.</p>
          <Link href="/advertise#job-posting" className="bg-[#1a3d6b] text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-[#0f2448] transition-colors">Post a job — $250</Link>
        </div>
      </div>
    </>
  );
}
