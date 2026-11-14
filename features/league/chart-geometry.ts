import type { RatingSeries } from "./stats";

export interface ChartLine {
  playerId: string;
  name: string;
  color: string;
  path: string;
  dots: { x: number; y: number; label: string }[];
}

export interface ChartGeometry {
  width: number;
  height: number;
  plot: { left: number; right: number; top: number; bottom: number };
  yTicks: { y: number; label: string }[];
  lines: ChartLine[];
}

const WIDTH = 640;
const HEIGHT = 260;
const PADDING = { left: 48, right: 16, top: 16, bottom: 28 };
const MIN_SPAN = 100;
const TICK_COUNT = 4;

function niceStep(span: number): number {
  const raw = span / TICK_COUNT;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  return [1, 2, 2.5, 5, 10].map((factor) => factor * magnitude).find((step) => step >= raw) ?? raw;
}

export function buildChartGeometry(series: readonly RatingSeries[]): ChartGeometry | null {
  const points = series.flatMap((item) => item.points);
  if (points.length < 2) return null;

  const values = points.map((point) => point.rating);
  const center = (Math.min(...values) + Math.max(...values)) / 2;
  const halfSpan = Math.max(Math.max(...values) - Math.min(...values), MIN_SPAN) / 2;
  const step = niceStep(halfSpan * 2);
  const minY = Math.floor((center - halfSpan) / step) * step;
  const maxY = Math.ceil((center + halfSpan) / step) * step;
  const maxX = Math.max(...points.map((point) => point.index), 1);
  const minX = Math.min(...points.map((point) => point.index));

  const plot = { left: PADDING.left, right: WIDTH - PADDING.right, top: PADDING.top, bottom: HEIGHT - PADDING.bottom };
  const scaleX = (index: number) => plot.left + ((index - minX) / Math.max(maxX - minX, 1)) * (plot.right - plot.left);
  const scaleY = (value: number) => plot.bottom - ((value - minY) / (maxY - minY)) * (plot.bottom - plot.top);

  const yTicks = [];
  for (let value = minY; value <= maxY; value += step) yTicks.push({ y: scaleY(value), label: String(Math.round(value)) });

  const lines = series
    .filter((item) => item.points.length > 0)
    .map((item) => {
      const dots = item.points.map((point) => ({
        x: scaleX(point.index),
        y: scaleY(point.rating),
        label: `${item.name}: ${Math.round(point.rating)} (${point.date})`,
      }));
      return {
        playerId: item.playerId,
        name: item.name,
        color: item.color,
        path: dots.map((dot, index) => `${index === 0 ? "M" : "L"}${dot.x.toFixed(1)},${dot.y.toFixed(1)}`).join(" "),
        dots,
      };
    });

  return { width: WIDTH, height: HEIGHT, plot, yTicks, lines };
}
