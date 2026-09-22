"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function NewKnowledgeForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [audience, setAudience] = useState("farmer");
  const [category, setCategory] = useState("agronomy");
  const [cropCode, setCropCode] = useState("");
  const [operation, setOperation] = useState("");
  const [contentBody, setContentBody] = useState("");
  const [sourceAttribution, setSourceAttribution] = useState("");
  const [approvingAuthority, setApprovingAuthority] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [open, setOpen] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const res = await fetch("/api/knowledge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        audience,
        category,
        cropCode,
        operation,
        contentBody,
        sourceAttribution,
        approvingAuthority,
        effectiveDate,
      }),
    });

    setSubmitting(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to create draft");
      return;
    }

    setTitle("");
    setContentBody("");
    setSourceAttribution("");
    setApprovingAuthority("");
    setEffectiveDate("");
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700"
      >
        + New draft
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-2xl space-y-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
    >
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-700">Title</label>
        <input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">Audience</label>
          <select
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="farmer">Farmer</option>
            <option value="fpo">FPO</option>
            <option value="buyer">Buyer</option>
            <option value="all">All</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="agronomy">Agronomy</option>
            <option value="governance">Governance</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">
            Crop code (optional)
          </label>
          <input
            value={cropCode}
            onChange={(e) => setCropCode(e.target.value)}
            placeholder="e.g. MUSTARD"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-700">
          Operation (optional)
        </label>
        <input
          value={operation}
          onChange={(e) => setOperation(e.target.value)}
          placeholder="e.g. sowing, irrigation, grading"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-700">Content</label>
        <textarea
          required
          rows={4}
          value={contentBody}
          onChange={(e) => setContentBody(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">
            Source attribution
          </label>
          <input
            value={sourceAttribution}
            onChange={(e) => setSourceAttribution(e.target.value)}
            placeholder="e.g. ICAR-CAZRI Jodhpur"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">
            Approving authority
          </label>
          <input
            value={approvingAuthority}
            onChange={(e) => setApprovingAuthority(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">
            Effective date
          </label>
          <input
            type="date"
            value={effectiveDate}
            onChange={(e) => setEffectiveDate(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-60"
        >
          {submitting ? "Saving…" : "Save draft"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
