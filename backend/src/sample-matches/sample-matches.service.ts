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
}
