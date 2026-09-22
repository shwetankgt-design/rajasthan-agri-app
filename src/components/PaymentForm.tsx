"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function PaymentForm({ contractId }: { contractId: string }) {
  const router = useRouter();
  const [amountRs, setAmountRs] = useState("");
  const [method, setMethod] = useState("upi");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const res = await fetch(`/api/contracts/${contractId}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountRs, method }),
    });

    setSubmitting(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to record payment");
      return;
    }

    setAmountRs("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-700">
          Amount (Rs)
        </label>
        <input
          type="number"
          min={0.01}
          step="0.01"
          required
          value={amountRs}
          onChange={(e) => setAmountRs(e.target.value)}
          className="w-32 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-700">
          Method
        </label>
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
          <option value="upi">UPI</option>
          <option value="neft">NEFT/RTGS</option>
          <option value="cash">Cash</option>
        </select>
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-60"
      >
        {submitting ? "Recording…" : "Record Payment"}
      </button>
      {error && <p className="w-full text-xs text-red-600">{error}</p>}
    </form>
  );
}
