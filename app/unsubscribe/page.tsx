"use client";
import { useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";

function UnsubscribeForm() {
  const params = useSearchParams();
  const emailFromUrl = params.get("email") || "";
  const [email, setEmail] = useState(emailFromUrl);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  useEffect(() => { if (emailFromUrl) setEmail(emailFromUrl); }, [emailFromUrl]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await fetch("/api/unsubscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      setStatus(res.ok ? "done" : "error");
    } catch { setStatus("error"); }
  }

  return (
    <div className="max-w-md mx-auto px-5 py-24 text-center">
      <Link href="/" className="inline-block mb-8 text-[#1a3d6b] font-semibold text-lg">NeuroTech.com</Link>
      {status === "done" ? (
        <>
          <div className="text-4xl mb-4">👋</div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-3">You're unsubscribed</h1>
          <p className="text-gray-500 mb-8">You won't receive the NeuroTech Digest anymore. You can resubscribe anytime.</p>
          <Link href="/newsletter" className="bg-[#1a3d6b] text-white px-6 py-3 rounded-xl font-medium hover:bg-[#0f2448] transition-colors">Resubscribe</Link>
        </>
      ) : (
        <>
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Unsubscribe</h1>
          <p className="text-gray-500 mb-8">Remove your email from the NeuroTech Digest mailing list.</p>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" required
              className="border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3d6b]/30 focus:border-[#1a3d6b]" />
            <button type="submit" disabled={status === "loading"}
              className="bg-gray-900 text-white py-3 rounded-xl text-sm font-medium hover:bg-gray-700 transition-colors disabled:opacity-60">
              {status === "loading" ? "Unsubscribing..." : "Unsubscribe"}
            </button>
          </form>
          {status === "error" && <p className="mt-3 text-sm text-red-500">Something went wrong. Try again.</p>}
          <p className="mt-6 text-xs text-gray-400">Changed your mind? <Link href="/newsletter" className="text-[#1a3d6b] hover:underline">Stay subscribed →</Link></p>
        </>
      )}
    </div>
  );
}

export default function UnsubscribePage() {
  return <Suspense><UnsubscribeForm /></Suspense>;
}
