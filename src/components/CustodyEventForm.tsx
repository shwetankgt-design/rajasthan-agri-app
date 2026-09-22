"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const EVENT_TYPES = [
  { value: "delivery", label: "Farmer delivery" },
  { value: "aggregation", label: "Aggregation" },
  { value: "grading", label: "Grading" },
  { value: "storage", label: "Storage" },
  { value: "dispatch", label: "Dispatch" },
  { value: "gate_in", label: "Buyer gate-in" },
];

export function CustodyEventForm({ lotId }: { lotId: string }) {
  const router = useRouter();
  const [eventType, setEventType] = useState("aggregation");
  const [quantityInKg, setQuantityInKg] = useState("");
  const [quantityOutKg, setQuantityOutKg] = useState("");
  const [location, setLocation] = useState("");
  const [actor, setActor] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const res = await fetch(`/api/lots/${lotId}/custody-events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventType,
        quantityInKg: quantityInKg || 0,
        quantityOutKg: quantityOutKg || 0,
        location,
        actor,
      }),
    });

    setSubmitting(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to record custody event");
      return;
    }

    setQuantityInKg("");
    setQuantityOutKg("");
    setLocation("");
    setActor("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">
            Event type
          </label>
          <select
            value={eventType}
            onChange={(e) => setEventType(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            {EVENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">
            Actor (optional)
          </label>
          <input
            value={actor}
            onChange={(e) => setActor(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            placeholder="e.g. grader name, transporter"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">
            Quantity in (kg)
          </label>
          <input
            type="number"
            min={0}
            value={quantityInKg}
            onChange={(e) => setQuantityInKg(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">
            Quantity out (kg)
          </label>
          <input
            type="number"
            min={0}
            value={quantityOutKg}
            onChange={(e) => setQuantityOutKg(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-700">
          Location (optional)
        </label>
        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          placeholder="e.g. Jodhpur collection centre"
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
        className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-60"
      >
        {submitting ? "Recording…" : "Record Custody Event"}
      </button>
    </form>
  );
}
