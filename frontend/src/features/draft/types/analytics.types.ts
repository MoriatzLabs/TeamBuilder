export type Role = "TOP" | "JGL" | "MID" | "ADC" | "SUP";
export type Team = "blue" | "red";
export type DraftPhase = "ban1" | "pick1" | "ban2" | "pick2" | "complete";
export type RecommendationType =
  | "comfort"
  | "counter"
  | "meta"
  | "synergy"
  | "deny"
  | "flex";
export type CompositionType = "teamfight" | "poke" | "pick" | "split" | "mixed";
export type PowerSpike = "early" | "mid" | "late";
export type DamageType = "ap" | "ad" | "true" | "mixed";

export interface Champion {
  id: string;
  name: string;
  roles: Role[];
  image: string;
  damageType?: DamageType;
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
  priority: number;
}

export interface Recommendation {
  champion: Champion;
  score: number;
  type: RecommendationType;
  reasons: string[];
  playerAffinity?: number;
  counterTo?: string;
  synergyWith?: string;
  flexLanes?: string[];
  goodAgainst?: string[];
  badAgainst?: string[];
  synergiesWith?: string[];
  masteryLevel?: "high" | "medium" | "low";
  teamNeeds?: string[];
}

// AI Recommendation API types
export interface AIPlayerData {
  name: string;
  role: string;
  championPool: {
    champion: string;
    games: number;
    winRate: number;
  }[];
}

export interface AIDraftState {
  phase: "ban" | "pick";
  currentTeam: "blue" | "red";
  pickNumber: number;
  blueTeam: {
    name: string;
    bans: string[];
    picks: { champion: string; role: string }[];
    players: AIPlayerData[];
  };
  redTeam: {
    name: string;
    bans: string[];
    picks: { champion: string; role: string }[];
    players: AIPlayerData[];
  };
  availableChampions: string[];
}

export interface AIRecommendation {
  championId: string;
  championName: string;
  score: number;
  type: RecommendationType;
  reasons: string[];
  flexLanes?: string[];
  goodAgainst?: string[];
  badAgainst?: string[];
  synergiesWith?: string[];
  masteryLevel?: "high" | "medium" | "low";
  teamNeeds?: string[];
}

export interface AIAnalysisResponse {
  recommendations: AIRecommendation[];
  analysis: string;
  teamComposition?: {
    type: string;
    strengths: string[];
    weaknesses: string[];
    damageBalance: { ap: number; ad: number };
  };
}

export interface TeamAnalysis {
  team: Team;
  strengths: string[];
  weaknesses: string[];
  compositionType: CompositionType;
  damageProfile: {
    ap: number;
    ad: number;
    true: number;
  };
  powerSpikes: PowerSpike[];
  engageLevel: number;
  peelLevel: number;
  waveclearLevel: number;
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

// WebSocket event names
export const WS_EVENTS = {
  CREATE_ROOM: "createRoom",
  JOIN_ROOM: "joinRoom",
  SELECT_CHAMPION: "selectChampion",
  LOCK_IN: "lockIn",
  UNDO: "undo",
  REQUEST_ANALYTICS: "requestAnalytics",
  ROOM_CREATED: "roomCreated",
  ROOM_JOINED: "roomJoined",
  DRAFT_STATE: "draftState",
  RECOMMENDATIONS: "recommendations",
  TEAM_ANALYSIS: "teamAnalysis",
  CHAMPION_SELECTED: "championSelected",
  CHAMPION_LOCKED: "championLocked",
  ERROR: "error",
  DRAFT_COMPLETE: "draftComplete",
} as const;
