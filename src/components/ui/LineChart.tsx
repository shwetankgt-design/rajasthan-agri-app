"use client";

import { useState } from "react";

export function LineChart({
  points,
  height = 120,
  valuePrefix = "",
  valueSuffix = "",
}: {
  points: { label: string; value: number }[];
  height?: number;
  // Server-component callers can't pass functions across the client
  // boundary, so formatting is a plain prefix/suffix pair instead of a
  // formatValue callback.
  valuePrefix?: string;
  valueSuffix?: string;
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  if (points.length === 0) {
    return <p className="text-sm text-slate-400">No data yet.</p>;
  }

  const width = 600;
  const padding = 8;
  const max = Math.max(...points.map((p) => p.value), 1);
  const min = Math.min(...points.map((p) => p.value), 0);
  const range = max - min || 1;

  const stepX = points.length > 1 ? (width - padding * 2) / (points.length - 1) : 0;
  const coords = points.map((p, i) => {
    const x = padding + i * stepX;
    const y = height - padding - ((p.value - min) / range) * (height - padding * 2);
    return { x, y, ...p };
  });

  const path = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(" ");
  const areaPath = `${path} L ${coords[coords.length - 1].x.toFixed(1)} ${height - padding} L ${coords[0].x.toFixed(1)} ${height - padding} Z`;

  const last = points[points.length - 1];
  const active = hoverIdx !== null ? coords[hoverIdx] : null;
  const fmt = (v: number) => `${valuePrefix}${v.toLocaleString("en-IN")}${valueSuffix}`;

  return (
    <div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full touch-none"
        preserveAspectRatio="none"
        style={{ height }}
        onMouseLeave={() => setHoverIdx(null)}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const relX = ((e.clientX - rect.left) / rect.width) * width;
          let nearest = 0;
          let nearestDist = Infinity;
          coords.forEach((c, i) => {
            const d = Math.abs(c.x - relX);
            if (d < nearestDist) {
              nearestDist = d;
              nearest = i;
            }
          });
          setHoverIdx(nearest);
        }}
      >
        <path d={areaPath} fill="rgb(79 45 127 / 0.10)" />
        <path d={path} fill="none" stroke="rgb(79 45 127)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {coords.map((c, i) => (
          <circle
            key={c.label}
            cx={c.x}
            cy={c.y}
            r={hoverIdx === i ? 4.5 : 2.5}
            fill="rgb(79 45 127)"
            stroke="white"
            strokeWidth={hoverIdx === i ? 1.5 : 0}
          />
        ))}
        {active && (
          <line x1={active.x} y1={0} x2={active.x} y2={height - padding} stroke="rgb(79 45 127)" strokeWidth={1} strokeDasharray="3 3" opacity={0.4} />
        )}
      </svg>
      <div className="mt-1 flex items-center justify-between text-xs text-slate-400">
        <span>{points[0].label}</span>
        {active ? (
          <span className="font-mono font-medium text-brand-700">
            {active.label}: {fmt(active.value)}
          </span>
        ) : (
          <span className="font-mono font-medium text-brand-700">{fmt(last.value)} latest</span>
        )}
        <span>{last.label}</span>
      </div>
    </div>
  );
}
