"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ResolveRequestButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function resolve() {
    setBusy(true);
    await fetch(`/api/data-subject-requests/${id}/resolve`, { method: "POST" });
    setBusy(false);
    router.refresh();
  }

  return (
    <button
      onClick={resolve}
      disabled={busy}
      className="rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
    >
      {busy ? "Processing…" : "Process"}
    </button>
  );
}
