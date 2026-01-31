import {
  Champion,
  DraftState,
  Recommendation,
  TeamAnalysis,
  Team,
  Player,
} from './analytics.types';

// Client -> Server Events
export interface CreateRoomPayload {
  blueTeamName: string;
  redTeamName: string;
  bluePlayers: Player[];
  redPlayers: Player[];
}

export interface JoinRoomPayload {
  roomId: string;
  team: Team;
}

export interface SelectChampionPayload {
  roomId: string;
  championId: string;
}

export interface LockInPayload {
  roomId: string;
}

export interface UndoPayload {
  roomId: string;
}

export interface RequestAnalyticsPayload {
  roomId: string;
  team: Team; // Which team's perspective for recommendations
}

// Server -> Client Events
export interface RoomCreatedEvent {
  roomId: string;
  draftState: DraftState;
}

export interface DraftStateEvent {
  draftState: DraftState;
  selectedChampion: Champion | null;
}

export interface RecommendationsEvent {
  recommendations: Recommendation[];
  forTeam: Team;
}

export interface TeamAnalysisEvent {
  blueTeamAnalysis: TeamAnalysis | null;
  redTeamAnalysis: TeamAnalysis | null;
}

export interface ErrorEvent {
  code: string;
  message: string;
}

export interface ChampionSelectedEvent {
  champion: Champion;
  byTeam: Team;
}

export interface ChampionLockedEvent {
  champion: Champion;
  byTeam: Team;
  step: number;
  type: 'ban' | 'pick';
}

// WebSocket Event Names
export const WS_EVENTS = {
  // Client -> Server
  CREATE_ROOM: 'createRoom',
  JOIN_ROOM: 'joinRoom',
  SELECT_CHAMPION: 'selectChampion',
  LOCK_IN: 'lockIn',
  UNDO: 'undo',
  REQUEST_ANALYTICS: 'requestAnalytics',

  // Server -> Client
  ROOM_CREATED: 'roomCreated',
  ROOM_JOINED: 'roomJoined',
  DRAFT_STATE: 'draftState',
  RECOMMENDATIONS: 'recommendations',
  TEAM_ANALYSIS: 'teamAnalysis',
  CHAMPION_SELECTED: 'championSelected',
  CHAMPION_LOCKED: 'championLocked',
  ERROR: 'error',
  DRAFT_COMPLETE: 'draftComplete',
} as const;
