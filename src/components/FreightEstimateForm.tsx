"use client";

import { useState } from "react";

type Facility = { id: string; name: string; district: string };
type Transporter = { id: string; name: string; ratePerKmRs: number };

export function FreightEstimateForm({
  facilities,
  transporters,
  defaultFromId,
}: {
  facilities: Facility[];
  transporters: Transporter[];
  defaultFromId?: string;
}) {
  const [fromId, setFromId] = useState(defaultFromId ?? facilities[0]?.id ?? "");
  const [toId, setToId] = useState(facilities[1]?.id ?? facilities[0]?.id ?? "");
  const [transporterId, setTransporterId] = useState(transporters[0]?.id ?? "");
  const [result, setResult] = useState<{
    distanceKm: number;
    costRs: number;
    rateUsedRsPerKm: number;
    transporterName: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setResult(null);

    const res = await fetch("/api/logistics/freight-estimate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fromFacilityId: fromId, toFacilityId: toId, transporterId }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to compute estimate");
      return;
    }

    setResult(await res.json());
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">From</label>
          <select
            value={fromId}
            onChange={(e) => setFromId(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            {facilities.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} ({f.district})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">To</label>
          <select
            value={toId}
            onChange={(e) => setToId(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            {facilities.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} ({f.district})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">
            Transporter
          </label>
          <select
            value={transporterId}
            onChange={(e) => setTransporterId(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            {transporters.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} (₹{t.ratePerKmRs.toFixed(0)}/km)
              </option>
            ))}
          </select>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-60"
      >
        {loading ? "Calculating…" : "Estimate Freight"}
      </button>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      {result && (
        <div className="rounded-md bg-brand-50 px-4 py-3 text-sm text-brand-800">
          <div>
            Straight-line distance: <strong>{result.distanceKm} km</strong>
          </div>
          <div>
            Indicative freight via {result.transporterName} at ₹
            {result.rateUsedRsPerKm.toFixed(0)}/km:{" "}
            <strong>₹{result.costRs.toLocaleString("en-IN")}</strong>
          </div>
          <p className="mt-1 text-xs text-brand-600">
            Straight-line estimate only — actual road distance will be higher.
          </p>
        </div>
      )}
    </form>
  );
}
