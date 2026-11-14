const percentFormatter = new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 0 });

export function formatRating(value: number): string {
  return Math.round(value).toLocaleString("pt-BR");
}

export function formatDelta(value: number | null): string {
  if (value === null) return "—";
  const rounded = Math.round(value);
  if (rounded === 0) return "±0";
  return rounded > 0 ? `+${rounded}` : `−${Math.abs(rounded)}`;
}

export function formatPercent(value: number): string {
  return percentFormatter.format(value);
}

export function formatDate(value: string): string {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

export function formatMatchCount(count: number): string {
  return count === 1 ? "1 partida" : `${count} partidas`;
}
