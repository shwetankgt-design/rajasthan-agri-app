"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function OfferForm({ lotId, maxKg }: { lotId: string; maxKg: number }) {
  const router = useRouter();
  const [quantityKg, setQuantityKg] = useState("");
  const [pricePerKgRs, setPricePerKgRs] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const res = await fetch("/api/offers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lotId, quantityKg, pricePerKgRs, message }),
    });

    setSubmitting(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to submit offer");
      return;
    }

    setDone(true);
    router.refresh();
  }

  if (done) {
    return (
      <div className="rounded-md bg-brand-50 px-3 py-2 text-sm text-brand-700">
        Offer submitted. The FPO will review it.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-700">
          Quantity (kg, up to {maxKg.toLocaleString("en-IN")})
        </label>
        <input
          type="number"
          min={1}
          max={maxKg}
          required
          value={quantityKg}
          onChange={(e) => setQuantityKg(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-700">
          Price per kg (Rs)
        </label>
        <input
          type="number"
          min={0.01}
          step="0.01"
          required
          value={pricePerKgRs}
          onChange={(e) => setPricePerKgRs(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-700">
          Message (optional)
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={2}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>
      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-60"
      >
        {submitting ? "Submitting…" : "Make Offer"}
      </button>
    </form>
  );
}
