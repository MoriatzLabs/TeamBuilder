import { create } from 'zustand';

export interface Champion {
  id: string;
  name: string;
  role?: string;
}

export interface DraftAction {
  type: 'ban' | 'pick';
  team: 'blue' | 'red';
  champion: Champion;
  phase: number;
}

export interface DraftState {
  seriesId: string | null;
  blueTeam: {
    bans: Champion[];
    picks: Champion[];
  };
  redTeam: {
    bans: Champion[];
    picks: Champion[];
  };
  currentPhase: 'ban' | 'pick' | null;
  currentTurn: 'blue' | 'red' | null;
  actions: DraftAction[];
  isLive: boolean;
}

interface DraftStore extends DraftState {
  setSeries: (seriesId: string) => void;
  addBan: (team: 'blue' | 'red', champion: Champion) => void;
  addPick: (team: 'blue' | 'red', champion: Champion) => void;
  setPhase: (phase: 'ban' | 'pick' | null) => void;
  setTurn: (turn: 'blue' | 'red' | null) => void;
  setLive: (isLive: boolean) => void;
  reset: () => void;
}

const initialState: DraftState = {
  seriesId: null,
  blueTeam: {
    bans: [],
    picks: [],
  },
  redTeam: {
    bans: [],
    picks: [],
  },
  currentPhase: null,
  currentTurn: null,
  actions: [],
  isLive: false,
};

export const useDraftStore = create<DraftStore>((set) => ({
  ...initialState,

  setSeries: (seriesId: string) =>
    set((state) => ({
      ...state,
      seriesId,
    })),

  addBan: (team: 'blue' | 'red', champion: Champion) =>
    set((state) => {
      const newState = { ...state };
      newState[`${team}Team`].bans.push(champion);
      newState.actions.push({
        type: 'ban',
        team,
        champion,
        phase: state.actions.length,
      });
      return newState;
    }),

  addPick: (team: 'blue' | 'red', champion: Champion) =>
    set((state) => {
      const newState = { ...state };
      newState[`${team}Team`].picks.push(champion);
      newState.actions.push({
        type: 'pick',
        team,
        champion,
        phase: state.actions.length,
      });
      return newState;
    }),

  setPhase: (phase: 'ban' | 'pick' | null) =>
    set((state) => ({
      ...state,
      currentPhase: phase,
    })),

  setTurn: (turn: 'blue' | 'red' | null) =>
    set((state) => ({
      ...state,
      currentTurn: turn,
    })),

  setLive: (isLive: boolean) =>
    set((state) => ({
      ...state,
      isLive,
    })),

  reset: () => set(initialState),
}));
