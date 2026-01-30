export interface KDAStats {
  kills: number;
  deaths: number;
  assists: number;
}

export function calculateKDA(stats: KDAStats): number {
  const { kills, deaths, assists } = stats;
  if (deaths === 0) {
    return kills + assists;
  }
  return (kills + assists) / deaths;
}

export function formatKDA(stats: KDAStats): string {
  const { kills, deaths, assists } = stats;
  return `${kills}/${deaths}/${assists}`;
}

export function formatKDAWithRatio(stats: KDAStats): string {
  const ratio = calculateKDA(stats);
  return `${formatKDA(stats)} (${ratio.toFixed(2)})`;
}

export function getKDAColor(ratio: number): string {
  if (ratio >= 5) return '#4ade80'; // green
  if (ratio >= 3) return '#22c55e'; // light green
  if (ratio >= 2) return '#eab308'; // yellow
  if (ratio >= 1) return '#f97316'; // orange
  return '#ef4444'; // red
}
