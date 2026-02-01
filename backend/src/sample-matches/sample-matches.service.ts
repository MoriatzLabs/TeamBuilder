import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

/** Full row from CSV (internal) */
export interface SampleMatchRow {
  match_id: string;
  player_id: string;
  team_id: string;
  team_name: string;
  player_name: string;
  role: string;
  champion: string;
  win: string;
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
  net_worth: string;
  loadout_value: string;
  kill_participation: string;
  damage_dealt: string;
  damage_taken: string;
  vision_score: string;
  opponent_player: string;
  opponent_champion: string;
  picks: string;
  bans: string;
  draft_sequence: string;
}

/** Stats returned by API (subset of columns) */
export const STATS_KEYS = [
  'outcome',
  'game_duration',
  'first_dragon',
  'first_tower',
  'kills',
  'deaths',
  'assists',
  'kda',
  'money',
  'total_money_earned',
  'kill_participation',
  'damage_dealt',
  'damage_taken',
  'opponent_player',
  'opponent_champion',
  'picks',
  'bans',
  'draft_sequence',
] as const;

export type SampleMatchStatsRow = Record<(typeof STATS_KEYS)[number], string>;

export interface TopChampionStats {
  champion: string;
  games: number;
  winRate: number;
  avgKda: number;
  avgGoldEarned: number;
  avgFirstTower: number;
  avgGameDuration: number;
  firstDragonPct?: number; // only for jungle
}

/** Parse a single CSV line respecting quoted commas */
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if ((c === ',' && !inQuotes) || (c === '\r' && !inQuotes)) {
      result.push(current.trim());
      current = '';
    } else if (c !== '\r') {
      current += c;
    }
  }
  result.push(current.trim());
  return result;
}

function rowToObject(headers: string[], values: string[]): Record<string, string> {
  const obj: Record<string, string> = {};
  headers.forEach((h, i) => {
    obj[h] = values[i] ?? '';
  });
  return obj;
}

@Injectable()
export class SampleMatchesService {
  private data: SampleMatchRow[] | null = null;
  private csvPath: string;

  constructor() {
    this.csvPath = path.join(process.cwd(), 'data', 'sample_matches.csv');
  }

  private loadData(): SampleMatchRow[] {
    if (this.data !== null) return this.data;
    if (!fs.existsSync(this.csvPath)) {
      this.data = [];
      return this.data;
    }
    const content = fs.readFileSync(this.csvPath, 'utf-8');
    const lines = content.split('\n').filter((l) => l.trim());
    if (lines.length < 2) {
      this.data = [];
      return this.data;
    }
    const headers = parseCsvLine(lines[0]);
    const rows: SampleMatchRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseCsvLine(lines[i]);
      const obj = rowToObject(headers, values) as unknown as SampleMatchRow;
      if (obj.team_name) rows.push(obj);
    }
    this.data = rows;
    return this.data;
  }

  getTeams(): string[] {
    const rows = this.loadData();
    const set = new Set(rows.map((r) => r.team_name).filter(Boolean));
    return Array.from(set).sort();
  }

  getPlayers(teamName: string): string[] {
    const rows = this.loadData();
    const set = new Set(
      rows.filter((r) => r.team_name === teamName).map((r) => r.player_name.trim()).filter(Boolean),
    );
    return Array.from(set).sort();
  }

  getChampions(teamName: string, playerName: string): string[] {
    const rows = this.loadData();
    const set = new Set(
      rows
        .filter((r) => r.team_name === teamName && r.player_name.trim() === playerName)
        .map((r) => r.champion)
        .filter(Boolean),
    );
    return Array.from(set).sort();
  }

  getStats(teamName: string, playerName: string, champion: string): SampleMatchStatsRow[] {
    const rows = this.loadData();
    const filtered = rows.filter(
      (r) =>
        r.team_name === teamName &&
        r.player_name.trim() === playerName &&
        r.champion === champion,
    );
    return filtered.map((r) => {
      const out: Record<string, string> = {};
      STATS_KEYS.forEach((key) => {
        out[key] = r[key] ?? '';
      });
      return out as SampleMatchStatsRow;
    });
  }

  /** Resolve draft team name to CSV team_name (exact or partial match) */
  resolveTeamName(displayName: string): string | null {
    const rows = this.loadData();
    const teams = Array.from(new Set(rows.map((r) => r.team_name).filter(Boolean)));
    const normalized = displayName.trim();
    const exact = teams.find((t) => t === normalized);
    if (exact) return exact;
    const partial = teams.find((t) => t.includes(normalized) || normalized.includes(t));
    return partial ?? null;
  }

  /** Role in draft is JGL; CSV uses JUNGLE */
  private normalizeRoleForCsv(role: string): string {
    return role === 'JGL' ? 'JUNGLE' : role;
  }

  /**
   * Top N champions for a player by performance (win rate, KDA, gold earned).
   * Includes win_rate, kda, first_tower, game_duration, gold_earned; first_dragon for junglers only.
   */
  getTopChampionsWithStats(
    teamName: string,
    playerName: string,
    role: string,
    limit = 5,
  ): TopChampionStats[] {
    const resolvedTeam = this.resolveTeamName(teamName);
    const csvRole = this.normalizeRoleForCsv(role);
    const rows = this.loadData();
    const playerRows = rows.filter(
      (r) =>
        (resolvedTeam ? r.team_name === resolvedTeam : r.team_name === teamName) &&
        r.player_name.trim() === playerName.trim() &&
        (r.role === csvRole || r.role === role),
    );
    if (playerRows.length === 0) return [];

    const byChamp = new Map<
      string,
      { wins: number; kdaSum: number; goldSum: number; ftSum: number; durSum: number; fdSum: number; n: number }
    >();
    for (const r of playerRows) {
      const champ = r.champion;
      if (!byChamp.has(champ)) {
        byChamp.set(champ, { wins: 0, kdaSum: 0, goldSum: 0, ftSum: 0, durSum: 0, fdSum: 0, n: 0 });
      }
      const row = byChamp.get(champ)!;
      row.n += 1;
      row.wins += Number(r.win) || 0;
      row.kdaSum += Number(r.kda) || 0;
      row.goldSum += Number(r.total_money_earned) || 0;
      row.ftSum += Number(r.first_tower) || 0;
      row.durSum += Number(r.game_duration) || 0;
      row.fdSum += Number(r.first_dragon) || 0;
    }

    const isJungle = csvRole === 'JUNGLE';
    const list: TopChampionStats[] = [];
    for (const [champion, agg] of byChamp) {
      const games = agg.n;
      list.push({
        champion,
        games,
        winRate: games ? (agg.wins / games) * 100 : 0,
        avgKda: games ? agg.kdaSum / games : 0,
        avgGoldEarned: games ? agg.goldSum / games : 0,
        avgFirstTower: games ? agg.ftSum / games : 0,
        avgGameDuration: games ? agg.durSum / games : 0,
        ...(isJungle && { firstDragonPct: games ? (agg.fdSum / games) * 100 : 0 }),
      });
    }

    const maxWr = Math.max(...list.map((x) => x.winRate), 1);
    const maxKda = Math.max(...list.map((x) => x.avgKda), 1);
    const maxGold = Math.max(...list.map((x) => x.avgGoldEarned), 1);
    list.sort((a, b) => {
      const scoreA = (a.winRate / maxWr) * 0.5 + (a.avgKda / maxKda) * 0.3 + (a.avgGoldEarned / maxGold) * 0.2;
      const scoreB = (b.winRate / maxWr) * 0.5 + (b.avgKda / maxKda) * 0.3 + (b.avgGoldEarned / maxGold) * 0.2;
      return scoreB - scoreA;
    });
    return list.slice(0, limit);
  }
}
