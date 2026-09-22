"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const QUICK_ACCESS_ACCOUNTS = [
  { role: "Farmer", phone: "9800000001" },
  { role: "FPO Staff", phone: "9800000010" },
  { role: "FPO Admin", phone: "9800000011" },
  { role: "Buyer", phone: "9800000020" },
  { role: "Government", phone: "9800000090" },
  { role: "Admin", phone: "9800000099" },
];

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, password }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Login failed");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  function quickFill(accountPhone: string) {
    setPhone(accountPhone);
    setPassword("demo1234");
    setError(null);
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden bg-brand-800 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "28px 28px",
          }}
        />
        <div className="relative flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-white text-xs font-bold tracking-tight text-brand-700">
            GT
          </span>
          <span className="text-sm font-medium text-brand-100">Grant Thornton Bharat</span>
        </div>

        <div className="relative">
          <h1 className="max-w-md text-3xl font-semibold leading-tight text-white">
            Predictive advisory, FPO aggregation and buyer marketplace — one
            platform for Rajasthan agriculture.
          </h1>
          <div className="mt-10 grid grid-cols-3 gap-6 border-t border-white/15 pt-8">
            <div>
              <div className="font-mono text-2xl font-semibold text-white">12</div>
              <div className="mt-1 text-xs text-brand-200">Platform modules</div>
            </div>
            <div>
              <div className="font-mono text-2xl font-semibold text-white">200</div>
              <div className="mt-1 text-xs text-brand-200">Farmers onboarded</div>
            </div>
            <div>
              <div className="font-mono text-2xl font-semibold text-white">3</div>
              <div className="mt-1 text-xs text-brand-200">FPOs, 2 districts</div>
            </div>
          </div>
        </div>

        <p className="relative text-xs text-brand-300">
          Government of Rajasthan · Department of Agriculture
        </p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center bg-slate-50 px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg bg-brand-600 text-xs font-bold tracking-tight text-white">
                GT
              </span>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-slate-900">
                  Agri-Intelligence Platform
                </div>
                <div className="truncate text-xs text-slate-500">Grant Thornton Bharat</div>
              </div>
            </div>
          </div>

          <h2 className="text-xl font-semibold text-slate-900">Sign in</h2>
          <p className="mt-1 text-sm text-slate-500">
            Enter your mobile number and password to continue.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="phone"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Mobile number
              </label>
              <input
                id="phone"
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                placeholder="98XXXXXXXX"
                required
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <p className="rounded-lg bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <div className="mt-8">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Quick access by role
            </p>
            <div className="grid grid-cols-2 gap-2">
              {QUICK_ACCESS_ACCOUNTS.map((acc) => (
                <button
                  key={acc.phone}
                  type="button"
                  onClick={() => quickFill(acc.phone)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-xs transition-colors hover:border-brand-300 hover:bg-brand-50"
                >
                  <div className="font-medium text-slate-700">{acc.role}</div>
                  <div className="mt-0.5 font-mono text-slate-400">{acc.phone}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
