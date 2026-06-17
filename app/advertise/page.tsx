"use client";
import { useState } from "react";

const PLANS = [
  { id: "featured-listing", name: "Featured Listing", price: "$199", per: "/month", highlight: true,
    paypal: "https://www.paypal.com/cgi-bin/webscr?cmd=_xclick-subscriptions&business=alonbraun@me.com&item_name=NeuroTech+Featured+Listing&a3=199&p3=1&t3=M&src=1&sra=1",
    features: ["Priority placement at top of your category", "Featured badge visible across the site", "Extended company profile with full description", "Inclusion in our weekly newsletter", "Inbound leads via contact button"] },
  { id: "job-posting", name: "Job Posting", price: "$250", per: "/30 days", highlight: false,
    paypal: "https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business=alonbraun@me.com&item_name=NeuroTech+Job+Posting&amount=250",
    features: ["30-day listing on NeuroTech Jobs", "Included in next 2 newsletter issues", "Apply link goes directly to your ATS", "Reach neurotech professionals actively hiring"] },
  { id: "newsletter-sponsor", name: "Newsletter Sponsor", price: "$500", per: "/issue", highlight: false,
    paypal: "https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business=alonbraun@me.com&item_name=NeuroTech+Newsletter+Sponsor&amount=500",
    features: ["Logo + 60-word blurb in NeuroTech Digest", "Sent every Sunday to all subscribers", "Linked to your website or landing page", "Max 2 sponsors per issue", "Archived permanently in newsletter archive"] },
  { id: "sponsored-article", name: "Sponsored Article", price: "$500", per: "/article", highlight: false,
    paypal: "https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business=alonbraun@me.com&item_name=NeuroTech+Sponsored+Article&amount=500",
    features: ["400–800 word thought leadership piece", "Published in News & Insights section", "Included in weekly newsletter", "Labeled 'Sponsored' for transparency", "Permanent archive on NeuroTech.com"] },
];

export default function AdvertisePage() {
  const [form, setForm] = useState({ company: "", email: "", message: "" });
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setStatus("done");
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-14">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900">Reach the neurotech industry</h1>
        <p className="mt-3 text-lg text-gray-500 max-w-xl mx-auto">
          NeuroTech.com is read by founders, investors, researchers, and clinicians in the neurotechnology space. All payments via PayPal — no contract required.
        </p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-2 gap-5 mb-14 max-w-4xl mx-auto">
        {PLANS.map((plan) => (
          <div key={plan.id} id={plan.id}
            className={`rounded-2xl p-6 flex flex-col ${plan.highlight ? "border-2 border-[#1a3d6b] bg-[#eef5fc]" : "border border-gray-100"}`}>
            {plan.highlight && <span className="text-xs font-semibold tracking-widest text-[#1a3d6b] uppercase mb-3">Most popular</span>}
            <h2 className="text-lg font-bold text-gray-900">{plan.name}</h2>
            <div className="mt-2 mb-4">
              <span className="text-3xl font-bold text-gray-900">{plan.price}</span>
              <span className="text-gray-400 text-sm">{plan.per}</span>
            </div>
            <ul className="flex-1 flex flex-col gap-2 mb-6">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                  <span className="text-[#1a3d6b] mt-0.5">✓</span>{f}
                </li>
              ))}
            </ul>
            <a href={plan.paypal} target="_blank" rel="noopener noreferrer"
              className={`text-center py-2.5 rounded-lg text-sm font-medium transition-colors ${plan.highlight ? "bg-[#1a3d6b] text-white hover:bg-[#0f2448]" : "border border-[#1a3d6b] text-[#1a3d6b] hover:bg-[#eef5fc]"}`}>
              Pay with PayPal
            </a>
          </div>
        ))}
      </div>
      <div className="bg-gray-50 rounded-2xl p-8 max-w-2xl mx-auto">
        <h3 className="text-xl font-bold text-gray-900 mb-1">Custom or enterprise?</h3>
        <p className="text-gray-500 text-sm mb-6">Multi-month packages, event sponsorships, or custom integrations — reach out and we'll build a package.</p>
        {status === "done" ? (
          <p className="text-[#1a3d6b] font-medium py-4">Thanks! We'll be in touch within 24 hours.</p>
        ) : (
          <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
            <input type="text" placeholder="Company name" required value={form.company} onChange={e => setForm(f => ({...f, company: e.target.value}))} className="border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3d6b]/30 focus:border-[#1a3d6b]" />
            <input type="email" placeholder="Your email" required value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} className="border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3d6b]/30 focus:border-[#1a3d6b]" />
            <textarea placeholder="What are you looking for?" rows={3} value={form.message} onChange={e => setForm(f => ({...f, message: e.target.value}))} className="border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3d6b]/30 focus:border-[#1a3d6b] resize-none" />
            <button type="submit" disabled={status === "loading"} className="bg-[#1a3d6b] text-white py-2.5 rounded-lg text-sm font-medium hover:bg-[#0f2448] transition-colors disabled:opacity-60">
              {status === "loading" ? "Sending..." : "Send inquiry"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
