import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { getWeatherOutlook } from "@/lib/farmConditions";

const CONDITION_ICON: Record<string, string> = {
  Clear: "☀️",
  "Partly cloudy": "🌤️",
  Cloudy: "☁️",
  "Light rain": "🌦️",
  Thunderstorm: "⛈️",
};

export function WeatherCard({ district, referenceDate }: { district: string; referenceDate: Date }) {
  const outlook = getWeatherOutlook(district, referenceDate);
  const rainfallTone =
    outlook.rainfallStatus === "deficient" ? "danger" : outlook.rainfallStatus === "surplus" ? "info" : "success";

  return (
    <Card>
      <CardBody>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-700">Weather &amp; Rainfall — {district}</h2>
            <p className="mt-0.5 text-xs text-slate-400">7-day outlook</p>
          </div>
          <Badge tone={rainfallTone}>{outlook.rainfallStatus} rainfall</Badge>
        </div>

        <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1 border-b border-slate-100 pb-3 text-sm">
          <Icon name="chart" className="h-4 w-4 flex-shrink-0 text-slate-400" />
          <span className="font-mono font-semibold tabular-nums text-slate-800">
            {outlook.last30DayRainfallMm} mm
          </span>
          <span className="text-slate-500">received in the last 30 days (normal: {outlook.normalRainfallMm} mm)</span>
        </div>

        {/* Seven day-columns crush below ~420px, so the strip scrolls instead of shrinking. */}
        <div className="-mx-1 mt-3 overflow-x-auto px-1">
          <div className="grid min-w-[26rem] grid-cols-7 gap-1.5">
            {outlook.forecast.map((d) => (
              <div key={d.dayLabel} className="rounded-lg bg-slate-50 px-1.5 py-2 text-center">
                <div className="text-[11px] font-medium text-slate-500">{d.dayLabel}</div>
                <div className="my-1 text-lg leading-none" aria-hidden>
                  {CONDITION_ICON[d.condition] ?? "🌤️"}
                </div>
                <div className="font-mono text-[11px] tabular-nums text-slate-700">
                  {d.tempMaxC}°/{d.tempMinC}°
                </div>
                <div className="mt-0.5 font-mono text-[10px] tabular-nums text-sky-600">{d.rainChancePct}%</div>
              </div>
            ))}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
