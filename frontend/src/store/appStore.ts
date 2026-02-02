import { create } from "zustand";

export type AppView = "hero" | "team-setup" | "draft" | "sample-stats" | "champion-stats";

export type TeamSide = "blue" | "red";

// 2026 Draft Strategy Types
// C9 can choose EITHER side selection OR pick order selection
export type DraftChoiceType = "side" | "pickOrder";
export type PickOrderChoice = "first" | "last";

// Configuration for the 2026 draft
export interface DraftConfig2026 {
  // What C9 chose to select (side or pick order)
  c9ChoiceType: DraftChoiceType;
  // If C9 chose side, which side they selected
  c9Side: TeamSide | null;
  // If C9 chose pick order, whether they want first or last pick
  c9PickOrder: PickOrderChoice | null;
  // The opponent then gets the other choice
  // If C9 picked side, opponent picks first/last
  // If C9 picked order, opponent picks blue/red
  opponentSide: TeamSide | null;
  opponentPickOrder: PickOrderChoice | null;
}

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
  // 2026 Draft Configuration
  draftConfig: DraftConfig2026 | null;
  // Champion stats view state
  championStatsContext: {
    teamName: string;
    playerName: string;
    champion: string;
    role: string;
  } | null;
}

interface AppStore extends AppState {
  setCurrentView: (view: AppView) => void;
  setC9Side: (side: TeamSide) => void;
  setEnemyTeam: (team: EnemyTeam) => void;
  setC9Players: (players: Player[]) => void;
  // 2026 Draft Methods
  setDraftConfig: (config: DraftConfig2026) => void;
  setC9ChooseSide: (side: TeamSide, opponentPickOrder: PickOrderChoice) => void;
  setC9ChoosePickOrder: (
    pickOrder: PickOrderChoice,
    opponentSide: TeamSide,
  ) => void;
  setChampionStatsContext: (context: {
    teamName: string;
    playerName: string;
    champion: string;
    role: string;
  } | null) => void;
  reset: () => void;
}

const initialState: AppState = {
  currentView: "hero",
  c9Side: null,
  enemyTeam: null,
  c9Players: null,
  draftConfig: null,
  championStatsContext: null,
};

export const useAppStore = create<AppStore>((set) => ({
  ...initialState,

  setCurrentView: (view: AppView) => set({ currentView: view }),

  setC9Side: (side: TeamSide) => set({ c9Side: side }),

  setEnemyTeam: (team: EnemyTeam) => set({ enemyTeam: team }),

  setC9Players: (players: Player[]) => set({ c9Players: players }),

  // 2026: C9 chooses their side (blue/red), opponent chooses pick order
  setC9ChooseSide: (side: TeamSide, opponentPickOrder: PickOrderChoice) =>
    set({
      c9Side: side,
      draftConfig: {
        c9ChoiceType: "side",
        c9Side: side,
        c9PickOrder: null,
        opponentSide: side === "blue" ? "red" : "blue",
        opponentPickOrder: opponentPickOrder,
      },
    }),

  // 2026: C9 chooses pick order (first/last), opponent chooses side
  setC9ChoosePickOrder: (pickOrder: PickOrderChoice, opponentSide: TeamSide) =>
    set({
      // Derive C9's side from opponent's choice
      c9Side: opponentSide === "blue" ? "red" : "blue",
      draftConfig: {
        c9ChoiceType: "pickOrder",
        c9Side: opponentSide === "blue" ? "red" : "blue",
        c9PickOrder: pickOrder,
        opponentSide: opponentSide,
        opponentPickOrder: pickOrder === "first" ? "last" : "first",
      },
    }),

  setDraftConfig: (config: DraftConfig2026) =>
    set({
      draftConfig: config,
      c9Side: config.c9Side,
    }),

  setChampionStatsContext: (context) =>
    set({ championStatsContext: context }),

  reset: () => set(initialState),
}));
