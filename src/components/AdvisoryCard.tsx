"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const TYPE_LABELS: Record<string, string> = {
  sowing_window: "Sowing window",
  irrigation: "Irrigation",
  sell_hold: "Sell / hold",
  pest_risk: "Pest risk",
};

export function AdvisoryCard({
  id,
  adviceType,
  message,
  reason,
  actionDateStart,
  actionDateEnd,
  cropName,
}: {
  id: string;
  adviceType: string;
  message: string;
  reason: string;
  actionDateStart: string;
  actionDateEnd: string | null;
  cropName: string;
}) {
  const router = useRouter();
  const [acking, setAcking] = useState(false);
  const [done, setDone] = useState(false);

  async function acknowledge() {
    setAcking(true);
    const res = await fetch(`/api/advisories/${id}/acknowledge`, { method: "POST" });
    setAcking(false);
    if (res.ok) {
      setDone(true);
      router.refresh();
    }
  }

  const dateLabel = actionDateEnd
    ? `${new Date(actionDateStart).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} – ${new Date(actionDateEnd).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`
    : new Date(actionDateStart).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
            {TYPE_LABELS[adviceType] ?? adviceType}
          </span>
          <span className="ml-2 text-xs text-gray-500">{cropName}</span>
        </div>
        <span className="text-xs font-medium text-gray-500">{dateLabel}</span>
      </div>
      <p className="mt-2 text-sm text-gray-800">{message}</p>
      <p className="mt-1 text-xs text-gray-400">{reason}</p>
      {!done ? (
        <button
          onClick={acknowledge}
          disabled={acking}
          className="mt-3 rounded-md border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
        >
          {acking ? "…" : "Mark as seen"}
        </button>
      ) : (
        <span className="mt-3 inline-block text-xs text-brand-700">Acknowledged</span>
      )}
    </div>
  );
}
