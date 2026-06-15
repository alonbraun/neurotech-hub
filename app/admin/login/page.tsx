"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AdminLoginPage() {
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const refs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];
  const router = useRouter();

  useEffect(() => { refs[0].current?.focus(); }, []);

  async function submit(pin: string) {
    setLoading(true); setError(false);
    const res = await fetch("/api/admin-login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pin }) });
    if (res.ok) { router.push("/admin"); }
    else { setError(true); setLoading(false); setDigits(["", "", "", "", "", ""]); setTimeout(() => refs[0].current?.focus(), 50); }
  }

  function handleChange(i: number, val: string) {
    const digit = val.replace(/\D/g, "").slice(-1);
    const next = [...digits]; next[i] = digit;
    setDigits(next); setError(false);
    if (digit && i < 5) refs[i + 1].current?.focus();
    if (digit && i === 5) { const pin = [...next.slice(0, 5), digit].join(""); if (pin.length === 6) submit(pin); }
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !digits[i] && i > 0) refs[i - 1].current?.focus();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-3xl border border-gray-100 p-10 w-full max-w-sm text-center">
        <Link href="/" className="text-[#1a3d6b] font-semibold text-lg">NeuroTech.com</Link>
        <p className="text-xs text-gray-400 mt-1 mb-8">Admin dashboard</p>
        <p className="text-sm font-medium text-gray-700 mb-6">Enter your PIN</p>
        <div className="flex justify-center gap-2 mb-6">
          {digits.map((d, i) => (
            <input key={i} ref={refs[i]} type="password" inputMode="numeric" maxLength={1} value={d}
              onChange={e => handleChange(i, e.target.value)} onKeyDown={e => handleKeyDown(i, e)}
              className={`w-11 h-14 text-center text-xl font-semibold rounded-xl border-2 focus:outline-none transition-colors
                ${error ? "border-red-300 bg-red-50 text-red-600" : d ? "border-[#1a3d6b] bg-[#eef5fc]" : "border-gray-200 bg-gray-50 focus:border-[#1a3d6b]"}`} />
          ))}
        </div>
        {error && <p className="text-sm text-red-500 mb-4">Incorrect PIN. Try again.</p>}
        {loading && <p className="text-sm text-gray-400">Verifying...</p>}
        <p className="text-xs text-gray-300 mt-6"><Link href="/" className="hover:text-gray-500">← Back to site</Link></p>
      </div>
    </div>
  );
}
