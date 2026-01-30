export interface WinRateStats {
  wins: number;
  losses: number;
  games?: number;
}

export function calculateWinRate(stats: WinRateStats): number {
  const total = stats.games || stats.wins + stats.losses;
  if (total === 0) return 0;
  return (stats.wins / total) * 100;
}

export function formatWinRate(stats: WinRateStats): string {
  return `${calculateWinRate(stats).toFixed(1)}%`;
}

export function formatWinRateWithGames(stats: WinRateStats): string {
  const winRate = calculateWinRate(stats);
  return `${winRate.toFixed(1)}% (${stats.wins}-${stats.losses})`;
}

export function getWinRateColor(winRate: number): string {
  if (winRate >= 60) return "#4ade80"; // green
  if (winRate >= 50) return "#22c55e"; // light green
  if (winRate >= 45) return "#eab308"; // yellow
  if (winRate >= 40) return "#f97316"; // orange
  return "#ef4444"; // red
}

export function getPickRateTier(pickRate: number): "S" | "A" | "B" | "C" | "D" {
  if (pickRate >= 40) return "S";
  if (pickRate >= 25) return "A";
  if (pickRate >= 15) return "B";
  if (pickRate >= 5) return "C";
  return "D";
}
