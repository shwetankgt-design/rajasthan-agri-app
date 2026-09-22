import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verifyChain } from "@/lib/custodyChain";

const EVENT_LABELS: Record<string, string> = {
  delivery: "Farmer delivery",
  aggregation: "Aggregation",
  grading: "Grading",
  storage: "Storage",
  dispatch: "Dispatch",
  gate_in: "Buyer gate-in",
};

// Public traceability page (FR-M7-09) — no login required, reachable by a QR
// code in principle. Deliberately excludes farmer identity and any personal
// data; only origin district/village and FPO-aggregate information appear.
export default async function PublicTracePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const lot = await prisma.lot.findUnique({
    where: { id },
    include: {
      crop: true,
      fpo: true,
      lotComponents: { include: { plot: true } },
      custodyEvents: { orderBy: { occurredAt: "asc" } },
    },
  });
  if (!lot) notFound();

  const villages = Array.from(new Set(lot.lotComponents.map((lc) => lc.plot.villageName)));
  const chainIntact = verifyChain(lot.custodyEvents) === -1;

  return (
    <div className="mx-auto min-h-screen max-w-2xl bg-slate-50 px-4 py-10 font-sans">
      <div className="rounded-xl2 border border-slate-200 bg-white p-6 shadow-card">
        <div className="mb-1 flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand-600 font-mono text-xs font-semibold text-white">
            R
          </span>
          <p className="text-xs uppercase tracking-wider text-slate-500">
            Rajasthan Agri-Intelligence Platform · Traceability record
          </p>
        </div>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">
          {lot.crop.name}
          {lot.grade ? ` — ${lot.grade}` : ""}
        </h1>

        <dl className="mt-4 grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 text-sm">
          <div>
            <dt className="text-slate-500">Origin</dt>
            <dd className="font-medium text-slate-800">
              {lot.fpo.district} district
              {villages.length > 0 ? ` — ${villages.join(", ")}` : ""}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Aggregated by</dt>
            <dd className="font-medium text-slate-800">{lot.fpo.legalName}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Quantity</dt>
            <dd className="font-mono font-medium tabular-nums text-slate-800">
              {lot.quantityKg.toLocaleString("en-IN")} kg
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Record integrity</dt>
            <dd>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${chainIntact ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}
              >
                {chainIntact ? "Verified, unaltered" : "Verification failed"}
              </span>
            </dd>
          </div>
        </dl>

        <p className="mt-4 text-xs text-slate-400">Individual farmer identity is not disclosed on this page.</p>
      </div>

      <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wider text-slate-500">Chain of custody</h2>
      <ol className="space-y-3">
        {lot.custodyEvents.map((e) => (
          <li key={e.id} className="rounded-xl2 border border-slate-200 bg-white p-3.5 text-sm shadow-card">
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-800">{EVENT_LABELS[e.eventType] ?? e.eventType}</span>
              <span className="text-xs text-slate-500">{new Date(e.occurredAt).toLocaleDateString("en-IN")}</span>
            </div>
            {e.location && <div className="mt-1 text-xs text-slate-500">{e.location}</div>}
          </li>
        ))}
        {lot.custodyEvents.length === 0 && (
          <li className="text-sm text-slate-400">No custody events recorded yet.</li>
        )}
      </ol>
    </div>
  );
}
