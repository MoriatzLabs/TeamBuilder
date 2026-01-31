import { create } from "zustand";

export type AppView = "hero" | "team-setup" | "draft";

export type TeamSide = "blue" | "red";

export interface Player {
  id: string;
  name: string;
  realName: string;
  role: string;
  image: string;
  nationality: string;
}

export interface EnemyTeam {
  id: string;
  name: string;
  abbreviation: string;
  logo?: string;
  players: Player[];
}

interface AppState {
  currentView: AppView;
  c9Side: TeamSide | null;
  enemyTeam: EnemyTeam | null;
  c9Players: Player[] | null;
}

interface AppStore extends AppState {
  setCurrentView: (view: AppView) => void;
  setC9Side: (side: TeamSide) => void;
  setEnemyTeam: (team: EnemyTeam) => void;
  setC9Players: (players: Player[]) => void;
  reset: () => void;
}

const initialState: AppState = {
  currentView: "hero",
  c9Side: null,
  enemyTeam: null,
  c9Players: null,
};

export const useAppStore = create<AppStore>((set) => ({
  ...initialState,

  setCurrentView: (view: AppView) => set({ currentView: view }),

  setC9Side: (side: TeamSide) => set({ c9Side: side }),

  setEnemyTeam: (team: EnemyTeam) => set({ enemyTeam: team }),

  setC9Players: (players: Player[]) => set({ c9Players: players }),

  reset: () => set(initialState),
}));
