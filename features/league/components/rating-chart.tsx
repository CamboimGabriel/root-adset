import type { ChartGeometry } from "../chart-geometry";

interface RatingChartProps {
  title: string;
  geometry: ChartGeometry | null;
  emptyMessage: string;
}

const SECTION = "flex flex-col gap-3 rounded-2xl border border-stone-700 bg-stone-900/60 p-5";
const SECTION_TITLE = "text-lg font-semibold text-amber-200";
const EMPTY = "text-sm text-stone-400";
const GRID_LINE = "stroke-stone-800";
const TICK_LABEL = "fill-stone-500 text-[11px]";
const LEGEND = "flex flex-wrap gap-x-4 gap-y-1 text-sm text-stone-300";
const LEGEND_SWATCH = "inline-block size-2.5 rounded-full";

export function RatingChart({ title, geometry, emptyMessage }: RatingChartProps) {
  return (
    <section className={SECTION}>
      <h2 className={SECTION_TITLE}>{title}</h2>
      {!geometry ? (
        <p className={EMPTY}>{emptyMessage}</p>
      ) : (
        <>
          <svg viewBox={`0 0 ${geometry.width} ${geometry.height}`} className="h-auto w-full" role="img" aria-label={title}>
            {geometry.yTicks.map((tick) => (
              <g key={tick.label}>
                <line x1={geometry.plot.left} x2={geometry.plot.right} y1={tick.y} y2={tick.y} className={GRID_LINE} />
                <text x={geometry.plot.left - 8} y={tick.y + 4} textAnchor="end" className={TICK_LABEL}>
                  {tick.label}
                </text>
              </g>
            ))}
            <text x={geometry.plot.right} y={geometry.height - 6} textAnchor="end" className={TICK_LABEL}>
              partidas →
            </text>
            {geometry.lines.map((line) => (
              <g key={line.playerId}>
                <path d={line.path} fill="none" stroke={line.color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
                {line.dots.map((dot, index) => (
                  <circle key={index} cx={dot.x} cy={dot.y} r={3.5} fill={line.color}>
                    <title>{dot.label}</title>
                  </circle>
                ))}
              </g>
            ))}
          </svg>
          <ul className={LEGEND}>
            {geometry.lines.map((line) => (
              <li key={line.playerId} className="flex items-center gap-1.5">
                <span className={LEGEND_SWATCH} style={{ backgroundColor: line.color }} />
                {line.name}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
