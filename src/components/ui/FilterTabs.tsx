import Link from "next/link";

function cx(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export function FilterTabs({
  basePath,
  paramName = "status",
  active,
  options,
  extraParams,
}: {
  basePath: string;
  paramName?: string;
  active: string;
  options: { value: string; label: string; count?: number }[];
  extraParams?: Record<string, string | undefined>;
}) {
  function hrefFor(value: string) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(extraParams ?? {})) {
      if (v) params.set(k, v);
    }
    if (value !== "all") params.set(paramName, value);
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }

  return (
    <div className="mb-5 flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const isActive = active === opt.value;
        return (
          <Link
            key={opt.value}
            href={hrefFor(opt.value)}
            className={cx(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-brand-600 text-white shadow-sm"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50",
            )}
          >
            {opt.label}
            {opt.count !== undefined && (
              <span
                className={cx(
                  "rounded-full px-1.5 text-xs font-mono",
                  isActive ? "bg-white/20" : "bg-slate-100 text-slate-500",
                )}
              >
                {opt.count}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
