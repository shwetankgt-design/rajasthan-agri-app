import { ReactNode } from "react";

export function StatCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-xl2 border border-slate-200 bg-white p-4 shadow-card transition-shadow hover:shadow-card-hover">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-mono text-2xl font-semibold tabular-nums text-slate-900">
            {value}
          </div>
          <div className="mt-1 text-sm text-slate-500">{label}</div>
          {hint && <div className="mt-1 text-xs text-slate-400">{hint}</div>}
        </div>
        {icon && (
          <div className="rounded-lg bg-brand-50 p-2 text-brand-600">{icon}</div>
        )}
      </div>
    </div>
  );
}
