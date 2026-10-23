"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

/**
 * Revenue, costs and profit over time: three lines on one money axis.
 * Hover / arrow keys move a crosshair that lists every series at that date.
 * Colours: the validated first three categorical slots (blue, orange, aqua) —
 * aqua is below 3:1 on white, so values are also in the end labels, the
 * tooltip and the table view below.
 */

export interface TrendPoint {
  label: string;
  revenue: number;
  costs: number;
  profit: number;
}

const SERIES = [
  { key: "revenue", label: "Revenue", color: "#2a78d6" },
  { key: "costs", label: "Costs", color: "#eb6834" },
  { key: "profit", label: "Profit", color: "#1baf7a" },
] as const;

const HEIGHT = 260;
const MARGIN = { top: 12, right: 92, bottom: 28, left: 56 };
const GRID = "#ece6dc";
const AXIS_TEXT = "#6f655c";

function niceStep(range: number, ticks: number): number {
  const raw = range / ticks;
  const power = 10 ** Math.floor(Math.log10(raw));
  const fraction = raw / power;
  return (fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10) * power;
}

export function TrendChart({ points, currency }: { points: TrendPoint[]; currency: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(720);
  const [active, setActive] = useState<number | null>(null);
  const titleId = useId();

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(280, Math.round(entry.contentRect.width))));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const format = (value: number, compact = false) =>
    new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      maximumFractionDigits: compact ? 0 : 2,
      notation: compact && Math.abs(value) >= 10000 ? "compact" : "standard",
    }).format(value);

  const values = points.flatMap((point) => SERIES.map((series) => point[series.key]));
  const rawMin = Math.min(0, ...values);
  const rawMax = Math.max(1, ...values);
  const step = niceStep(rawMax - rawMin, 4);
  const min = Math.floor(rawMin / step) * step;
  const max = Math.ceil(rawMax / step) * step;
  const ticks: number[] = [];
  for (let tick = min; tick <= max + step / 2; tick += step) ticks.push(Math.round(tick * 100) / 100);

  const plotWidth = Math.max(40, width - MARGIN.left - MARGIN.right);
  const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom;
  const x = (index: number) => MARGIN.left + (points.length <= 1 ? plotWidth / 2 : (index / (points.length - 1)) * plotWidth);
  const y = (value: number) => MARGIN.top + plotHeight - ((value - min) / (max - min || 1)) * plotHeight;

  const labelEvery = Math.max(1, Math.ceil(points.length / Math.max(2, Math.floor(plotWidth / 90))));
  const last = points.length - 1;

  // Direct end labels, nudged apart so they never overlap.
  const endLabels = SERIES.map((series) => ({ ...series, y: y(points[last]?.[series.key] ?? 0) })).sort((a, b) => a.y - b.y);
  for (let i = 1; i < endLabels.length; i += 1) {
    if (endLabels[i].y - endLabels[i - 1].y < 15) endLabels[i].y = endLabels[i - 1].y + 15;
  }

  function pick(event: PointerEvent<SVGRectElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const relative = ((event.clientX - bounds.left) / bounds.width) * plotWidth;
    setActive(Math.min(last, Math.max(0, Math.round((relative / plotWidth) * last))));
  }

  function onKey(event: KeyboardEvent<SVGRectElement>) {
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      const delta = event.key === "ArrowRight" ? 1 : -1;
      setActive((current) => Math.min(last, Math.max(0, (current ?? (delta > 0 ? -1 : last + 1)) + delta)));
    } else if (event.key === "Escape") {
      setActive(null);
    }
  }

  const activePoint = active === null ? null : points[active];
  const tooltipLeft = active === null ? 0 : x(active);

  return (
    <div>
      <ul className="mb-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-charcoal" aria-label="Legend">
        {SERIES.map((series) => (
          <li key={series.key} className="flex items-center gap-1.5">
            <span aria-hidden="true" className="inline-block h-0.5 w-4 rounded-full" style={{ backgroundColor: series.color }} />
            {series.label}
          </li>
        ))}
      </ul>

      <div ref={containerRef} className="relative">
        <svg width={width} height={HEIGHT} role="img" aria-labelledby={titleId} className="block max-w-full overflow-visible">
          <title id={titleId}>
            {`Revenue, costs and profit over ${points.length} periods. Use the table below for every value.`}
          </title>

          {ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={MARGIN.left}
                x2={MARGIN.left + plotWidth}
                y1={y(tick)}
                y2={y(tick)}
                stroke={tick === 0 ? "#cfc5b6" : GRID}
                strokeWidth={1}
                shapeRendering="crispEdges"
              />
              <text x={MARGIN.left - 8} y={y(tick)} dy="0.32em" textAnchor="end" fontSize={11} fill={AXIS_TEXT} className="tabular-nums">
                {format(tick, true)}
              </text>
            </g>
          ))}

          {points.map((point, index) =>
            index % labelEvery === 0 || index === last ? (
              index === last || last - index >= labelEvery / 2 ? (
                <text key={point.label} x={x(index)} y={HEIGHT - 8} textAnchor="middle" fontSize={11} fill={AXIS_TEXT}>
                  {point.label}
                </text>
              ) : null
            ) : null,
          )}

          {SERIES.map((series) => (
            <polyline
              key={series.key}
              fill="none"
              stroke={series.color}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              points={points.map((point, index) => `${x(index)},${y(point[series.key])}`).join(" ")}
            />
          ))}

          {last >= 0 &&
            SERIES.map((series) => (
              <circle key={series.key} cx={x(last)} cy={y(points[last][series.key])} r={4} fill={series.color} stroke="#ffffff" strokeWidth={2} />
            ))}

          {last >= 0 &&
            endLabels.map((label) => (
              <text key={label.key} x={x(last) + 9} y={label.y} dy="0.32em" fontSize={11} fill="#2b2724">
                {label.label}
              </text>
            ))}

          {activePoint && active !== null && (
            <g aria-hidden="true">
              <line x1={x(active)} x2={x(active)} y1={MARGIN.top} y2={MARGIN.top + plotHeight} stroke="#a89d8f" strokeWidth={1} />
              {SERIES.map((series) => (
                <circle key={series.key} cx={x(active)} cy={y(activePoint[series.key])} r={4} fill={series.color} stroke="#ffffff" strokeWidth={2} />
              ))}
            </g>
          )}

          <rect
            x={MARGIN.left}
            y={MARGIN.top}
            width={plotWidth}
            height={plotHeight}
            fill="transparent"
            tabIndex={0}
            role="presentation"
            aria-label="Chart: use left and right arrow keys to read each period"
            onPointerMove={pick}
            onPointerDown={pick}
            onPointerLeave={() => setActive(null)}
            onFocus={() => setActive((current) => current ?? last)}
            onBlur={() => setActive(null)}
            onKeyDown={onKey}
            className="cursor-crosshair outline-none focus-visible:stroke-[#56664f] focus-visible:[stroke-width:1]"
          />
        </svg>

        {activePoint && (
          <div
            role="status"
            className="pointer-events-none absolute top-2 z-10 min-w-40 rounded-lg border border-line bg-white px-3 py-2 text-xs shadow-[var(--shadow-float)]"
            style={{
              left: Math.min(Math.max(tooltipLeft - 80, 0), width - 170),
            }}
          >
            <p className="mb-1.5 font-medium text-charcoal">{activePoint.label}</p>
            <ul className="space-y-1">
              {SERIES.map((series) => (
                <li key={series.key} className="flex items-center gap-2">
                  <span aria-hidden="true" className="inline-block h-0.5 w-3 rounded-full" style={{ backgroundColor: series.color }} />
                  <strong className="tabular-nums text-charcoal">{format(activePoint[series.key])}</strong>
                  <span className="text-muted">{series.label}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <details className="mt-4 rounded-lg border border-line">
        <summary className="cursor-pointer px-4 py-2.5 text-sm text-charcoal hover:bg-cream/60">View as a table</summary>
        <div className="max-h-80 overflow-auto border-t border-line">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-white text-xs text-muted">
              <tr>
                <th scope="col" className="px-4 py-2 font-medium">Period</th>
                {SERIES.map((series) => (
                  <th key={series.key} scope="col" className="px-4 py-2 text-right font-medium">{series.label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {points.map((point) => (
                <tr key={point.label}>
                  <th scope="row" className="px-4 py-1.5 font-normal text-charcoal">{point.label}</th>
                  {SERIES.map((series) => (
                    <td key={series.key} className="px-4 py-1.5 text-right tabular-nums text-charcoal">{format(point[series.key])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
