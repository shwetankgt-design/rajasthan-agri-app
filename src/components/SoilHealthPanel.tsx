import { Badge } from "@/components/ui/Badge";
import { getSoilHealth } from "@/lib/farmConditions";

const LEVEL_TONE = {
  low: "danger",
  medium: "warning",
  high: "success",
} as const;

export function SoilHealthPanel({ plotId, soilTypeDeclared }: { plotId: string; soilTypeDeclared: string | null }) {
  const soil = getSoilHealth(plotId, soilTypeDeclared);

  return (
    <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50/60 p-3">
      <div className="mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Soil health</span>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-5">
        <div>
          <div className="text-xs text-slate-500">pH</div>
          <div className="font-mono font-medium tabular-nums text-slate-800">
            {soil.phLevel} <span className="text-xs capitalize text-slate-500">({soil.phLabel})</span>
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-500">Organic carbon</div>
          <div className="font-mono font-medium tabular-nums text-slate-800">{soil.organicCarbonPct}%</div>
        </div>
        <div>
          <div className="text-xs text-slate-500">Nitrogen (N)</div>
          <Badge tone={LEVEL_TONE[soil.nitrogen]}>{soil.nitrogen}</Badge>
        </div>
        <div>
          <div className="text-xs text-slate-500">Phosphorus (P)</div>
          <Badge tone={LEVEL_TONE[soil.phosphorus]}>{soil.phosphorus}</Badge>
        </div>
        <div>
          <div className="text-xs text-slate-500">Potassium (K)</div>
          <Badge tone={LEVEL_TONE[soil.potassium]}>{soil.potassium}</Badge>
        </div>
      </div>
      <p className="mt-2.5 text-xs text-slate-500">{soil.recommendation}</p>
    </div>
  );
}
