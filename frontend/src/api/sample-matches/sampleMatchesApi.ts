/**
 * Sample matches API – teams, players, champions, and stats from sample_matches.csv
 */

const API_BASE =
  (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "") + "/api/sample-matches";

/** Stats row returned by API (subset of CSV columns) */
export interface SampleMatchStatsRow {
  outcome: string;
  game_duration: string;
  first_dragon: string;
  first_tower: string;
  kills: string;
  deaths: string;
  assists: string;
  kda: string;
  money: string;
  total_money_earned: string;
  kill_participation: string;
  damage_dealt: string;
  damage_taken: string;
  opponent_player: string;
  opponent_champion: string;
  picks: string;
  bans: string;
  draft_sequence: string;
}

export async function fetchSampleMatchTeams(): Promise<string[]> {
  const res = await fetch(`${API_BASE}/teams`);
  if (!res.ok) throw new Error("Failed to fetch teams");
  const data = await res.json();
  return data.teams ?? [];
}

export async function fetchSampleMatchPlayers(team: string): Promise<string[]> {
  if (!team) return [];
  const res = await fetch(
    `${API_BASE}/players?${new URLSearchParams({ team })}`
  );
  if (!res.ok) throw new Error("Failed to fetch players");
  const data = await res.json();
  return data.players ?? [];
}

export async function fetchSampleMatchChampions(
  team: string,
  player: string
): Promise<string[]> {
  if (!team || !player) return [];
  const res = await fetch(
    `${API_BASE}/champions?${new URLSearchParams({ team, player })}`
  );
  if (!res.ok) throw new Error("Failed to fetch champions");
  const data = await res.json();
  return data.champions ?? [];
}

export async function fetchSampleMatchStats(
  team: string,
  player: string,
  champion: string
): Promise<SampleMatchStatsRow[]> {
  if (!team || !player || !champion) return [];
  const res = await fetch(
    `${API_BASE}/stats?${new URLSearchParams({ team, player, champion })}`
  );
  if (!res.ok) throw new Error("Failed to fetch stats");
  const data = await res.json();
  return data.stats ?? [];
}

export const sampleMatchesApiKeys = {
  teams: ["sample-matches", "teams"] as const,
  players: (team: string) => ["sample-matches", "players", team] as const,
  champions: (team: string, player: string) =>
    ["sample-matches", "champions", team, player] as const,
  stats: (team: string, player: string, champion: string) =>
    ["sample-matches", "stats", team, player, champion] as const,
};
