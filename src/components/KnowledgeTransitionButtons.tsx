"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const NEXT_STEPS: Record<string, { toStatus: string; label: string }[]> = {
  draft: [{ toStatus: "technical_review", label: "Send for technical review" }],
  technical_review: [
    { toStatus: "approved", label: "Approve" },
    { toStatus: "draft", label: "Send back to draft" },
  ],
  approved: [
    { toStatus: "published", label: "Publish" },
    { toStatus: "technical_review", label: "Return to review" },
  ],
  published: [{ toStatus: "expired", label: "Expire" }],
  expired: [],
};

export function KnowledgeTransitionButtons({
  id,
  status,
}: {
  id: string;
  status: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function transition(toStatus: string) {
    setError(null);
    setBusy(true);
    const res = await fetch(`/api/knowledge/${id}/transition`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toStatus }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Transition failed");
      return;
    }
    router.refresh();
  }

  const steps = NEXT_STEPS[status] ?? [];

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {steps.map((s) => (
          <button
            key={s.toStatus}
            onClick={() => transition(s.toStatus)}
            disabled={busy}
            className="rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
          >
            {s.label}
          </button>
        ))}
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
