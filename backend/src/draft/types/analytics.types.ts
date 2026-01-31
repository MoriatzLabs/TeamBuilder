export type Role = 'TOP' | 'JGL' | 'MID' | 'ADC' | 'SUP';
export type Team = 'blue' | 'red';
export type DraftPhase = 'ban1' | 'pick1' | 'ban2' | 'pick2' | 'complete';
export type RecommendationType = 'comfort' | 'counter' | 'meta' | 'synergy' | 'deny';
export type CompositionType = 'teamfight' | 'poke' | 'pick' | 'split' | 'mixed';
export type PowerSpike = 'early' | 'mid' | 'late';
export type DamageType = 'ap' | 'ad' | 'true' | 'mixed';

export interface Champion {
  id: string;
  name: string;
  roles: Role[];
  image: string;
  damageType: DamageType;
  tags?: string[];
}

export interface Player {
  id: string;
  name: string;
  role: Role;
  team: string;
  championPool: ChampionPoolEntry[];
}

export interface ChampionPoolEntry {
  championId: string;
  championName: string;
  games: number;
  wins: number;
  winRate: number;
  priority: number; // 1-10 how important this pick is for the player
}

export interface Recommendation {
  champion: Champion;
  score: number; // 0-100 priority score
  type: RecommendationType;
  reasons: string[];
  playerAffinity?: number; // Games played on this champion
  counterTo?: string; // Enemy champion this counters
  synergyWith?: string; // Ally champion this synergizes with
}

export interface TeamAnalysis {
  team: Team;
  strengths: string[];
  weaknesses: string[];
  compositionType: CompositionType;
  damageProfile: {
    ap: number; // percentage
    ad: number;
    true: number;
  };
  powerSpikes: PowerSpike[];
  engageLevel: number; // 0-100
  peelLevel: number; // 0-100
  waveclearLevel: number; // 0-100
}

export interface DraftContext {
  phase: DraftPhase;
  currentTeam: Team;
  currentStep: number;
  roleNeeded: Role | null;
  blueFilledRoles: Role[];
  redFilledRoles: Role[];
  bluePicks: Champion[];
  redPicks: Champion[];
  blueBans: Champion[];
  redBans: Champion[];
  allBannedChampionIds: string[];
  allPickedChampionIds: string[];
}

export interface DraftState {
  roomId: string;
  blueTeam: {
    name: string;
    players: Player[];
    bans: (Champion | null)[];
    picks: (Champion | null)[];
  };
  redTeam: {
    name: string;
    players: Player[];
    bans: (Champion | null)[];
    picks: (Champion | null)[];
  };
  currentStep: number;
  isComplete: boolean;
  phase: DraftPhase;
  currentTeam: Team;
}

export interface AnalyticsResult {
  recommendations: Recommendation[];
  blueTeamAnalysis: TeamAnalysis | null;
  redTeamAnalysis: TeamAnalysis | null;
  context: DraftContext;
}
