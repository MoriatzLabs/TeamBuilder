export type Team = "blue" | "red";
export type DraftPhase = "ban1" | "pick1" | "ban2" | "pick2" | "complete";
export type ActionType = "ban" | "pick";
export type Role = "TOP" | "JGL" | "MID" | "ADC" | "SUP";

export interface Champion {
  id: string;
  name: string;
  roles: Role[];
  image: string;
  pickRate?: number;
  winRate?: number;
}

export interface DraftAction {
  step: number;
  team: Team;
  type: ActionType;
  champion: Champion | null;
  timestamp: number;
}

export interface ChampionPoolEntry {
  champion: string;
  games: number;
  winRate: number;
}

export interface DraftPlayer {
  id: string;
  name: string;
  role: Role;
  championPool: ChampionPoolEntry[];
}

export interface TeamDraft {
  name: string;
  bans: (Champion | null)[];
  picks: (Champion | null)[];
  players: DraftPlayer[];
}

export interface DraftStep {
  step: number;
  phase: DraftPhase;
  team: Team;
  type: ActionType;
  label: string;
}

export interface DraftState {
  // Draft identification
  draftId: string | null;

  // Team states
  blueTeam: TeamDraft;
  redTeam: TeamDraft;

  // Draft progress
  currentStep: number;
  isComplete: boolean;

  // Selection state
  selectedChampion: Champion | null;
  hoveredChampion: Champion | null;

  // Champion availability
  availableChampions: Champion[];

  // Action history for undo
  actions: DraftAction[];

  // UI state
  searchQuery: string;
  roleFilter: Role | null;
}

export interface DraftStore extends DraftState {
  // Champion management
  setAvailableChampions: (champions: Champion[]) => void;

  // Selection actions
  selectChampion: (champion: Champion) => void;
  hoverChampion: (champion: Champion | null) => void;
  confirmSelection: () => void;

  // Draft flow
  undo: () => void;
  reset: () => void;

  // UI actions
  setSearchQuery: (query: string) => void;
  setRoleFilter: (role: Role | null) => void;

  // Computed helpers
  getCurrentStep: () => DraftStep | null;
  isChampionAvailable: (championId: string) => boolean;
  getBannedChampionIds: () => string[];
  getPickedChampionIds: () => string[];
}
