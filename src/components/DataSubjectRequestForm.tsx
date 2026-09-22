"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DataSubjectRequestForm() {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(requestType: "access" | "erasure" | "portability") {
    setError(null);
    setBusy(requestType);
    const res = await fetch("/api/data-subject-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestType }),
    });
    setBusy(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to submit request");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => submit("access")}
          disabled={busy !== null}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-60"
        >
          {busy === "access" ? "Requesting…" : "Request access to my data"}
        </button>
        <button
          onClick={() => submit("portability")}
          disabled={busy !== null}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-60"
        >
          {busy === "portability" ? "Requesting…" : "Request a copy (portability)"}
        </button>
        <button
          onClick={() => submit("erasure")}
          disabled={busy !== null}
          className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 disabled:opacity-60"
        >
          {busy === "erasure" ? "Requesting…" : "Request erasure"}
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
