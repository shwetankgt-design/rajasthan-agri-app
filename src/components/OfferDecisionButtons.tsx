"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function OfferDecisionButtons({
  offerId,
  canCounter,
  currentQuantityKg,
  currentPricePerKgRs,
}: {
  offerId: string;
  canCounter: boolean;
  currentQuantityKg: number;
  currentPricePerKgRs: number;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [countering, setCountering] = useState(false);
  const [quantityKg, setQuantityKg] = useState(String(currentQuantityKg));
  const [pricePerKgRs, setPricePerKgRs] = useState(String(currentPricePerKgRs));

  async function decide(action: "accept" | "reject") {
    setError(null);
    setBusy(true);
    const res = await fetch(`/api/offers/${offerId}/${action}`, { method: "POST" });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Action failed");
      return;
    }
    router.refresh();
  }

  async function submitCounter(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await fetch(`/api/offers/${offerId}/counter`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantityKg, pricePerKgRs }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Counter-offer failed");
      return;
    }
    setCountering(false);
    router.refresh();
  }

  if (countering) {
    return (
      <form onSubmit={submitCounter} className="w-48 space-y-1.5 rounded-lg border border-slate-200 bg-white p-2.5 shadow-card">
        <div className="flex gap-1.5">
          <input
            type="number"
            min={1}
            required
            value={quantityKg}
            onChange={(e) => setQuantityKg(e.target.value)}
            placeholder="Qty (kg)"
            className="w-1/2 rounded-md border border-slate-300 px-2 py-1 text-xs focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <input
            type="number"
            min={0.01}
            step="0.01"
            required
            value={pricePerKgRs}
            onChange={(e) => setPricePerKgRs(e.target.value)}
            placeholder="Rs/kg"
            className="w-1/2 rounded-md border border-slate-300 px-2 py-1 text-xs focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        {error && <p className="text-[11px] text-rose-600">{error}</p>}
        <div className="flex gap-1.5">
          <button
            type="submit"
            disabled={busy}
            className="flex-1 rounded-md bg-brand-600 px-2 py-1 text-[11px] font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            Send counter
          </button>
          <button
            type="button"
            onClick={() => setCountering(false)}
            className="rounded-md border border-slate-200 px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => decide("accept")}
          disabled={busy}
          className="rounded-md bg-brand-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-brand-700 disabled:opacity-60"
        >
          Accept
        </button>
        {canCounter && (
          <button
            onClick={() => setCountering(true)}
            disabled={busy}
            className="rounded-md border border-brand-300 px-3 py-1.5 text-xs font-medium text-brand-700 transition hover:bg-brand-50 disabled:opacity-60"
          >
            Counter
          </button>
        )}
        <button
          onClick={() => decide("reject")}
          disabled={busy}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
        >
          Reject
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
    </div>
  );
}
