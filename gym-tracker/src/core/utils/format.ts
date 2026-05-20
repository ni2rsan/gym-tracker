export function formatWeight(value: number | null | undefined): string {
  if (value == null) return "—";
  return `${Number(value).toFixed(1)} kg`;
}

export function formatPct(value: number | null | undefined): string {
  if (value == null) return "—";
  return `${Number(value).toFixed(1)}%`;
}
