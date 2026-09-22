export function BarChart({
  data,
  formatValue,
}: {
  data: { label: string; value: number; tone?: "brand" | "teal" | "success" | "warning" | "danger" }[];
  formatValue?: (v: number) => string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const toneClass: Record<string, string> = {
    brand: "bg-brand-600",
    teal: "bg-accent-teal",
    success: "bg-emerald-500",
    warning: "bg-amber-500",
    danger: "bg-rose-500",
  };

  return (
    <div className="space-y-3">
      {data.map((d) => (
        <div key={d.label}>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="text-slate-600">{d.label}</span>
            <span className="font-mono tabular-nums text-slate-500">
              {formatValue ? formatValue(d.value) : d.value.toLocaleString("en-IN")}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full ${toneClass[d.tone ?? "brand"]}`}
              style={{ width: `${Math.max(2, (d.value / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
