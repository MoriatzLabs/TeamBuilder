import { create } from "zustand";
import type {
  Champion,
  Role,
  DraftAction,
  TeamDraft,
  DraftStep,
  DraftPlayer,
} from "../types/draft.types";
import type {
  Recommendation,
  TeamAnalysis,
  Team,
} from "../types/analytics.types";
import type { Player, EnemyTeam } from "@/store/appStore";
import { getCurrentDraftStep, isDraftComplete } from "../utils/draftSequence";

// Mock champion pool data for C9 players
const C9_PLAYER_POOLS: Record<
  string,
  { champion: string; games: number; winRate: number }[]
> = {
  "c9-thanatos": [
    { champion: "Rumble", games: 10, winRate: 70.0 },
    { champion: "K'Sante", games: 8, winRate: 62.5 },
    { champion: "Renekton", games: 7, winRate: 57.1 },
    { champion: "Jayce", games: 6, winRate: 66.7 },
    { champion: "Gnar", games: 5, winRate: 60.0 },
  ],
  "c9-blaber": [
    { champion: "Lee Sin", games: 12, winRate: 66.7 },
    { champion: "Nidalee", games: 8, winRate: 75.0 },
    { champion: "Viego", games: 7, winRate: 57.1 },
    { champion: "Rek'Sai", games: 6, winRate: 66.7 },
    { champion: "Elise", games: 5, winRate: 60.0 },
  ],
  "c9-apa": [
    { champion: "Ahri", games: 10, winRate: 70.0 },
    { champion: "Azir", games: 8, winRate: 62.5 },
    { champion: "Syndra", games: 7, winRate: 57.1 },
    { champion: "Orianna", games: 6, winRate: 66.7 },
    { champion: "Akali", games: 5, winRate: 60.0 },
  ],
  "c9-zven": [
    { champion: "Jinx", games: 11, winRate: 72.7 },
    { champion: "Kai'Sa", games: 9, winRate: 66.7 },
    { champion: "Aphelios", games: 8, winRate: 62.5 },
    { champion: "Zeri", games: 6, winRate: 66.7 },
    { champion: "Ezreal", games: 5, winRate: 60.0 },
  ],
  "c9-vulcan": [
    { champion: "Nautilus", games: 10, winRate: 70.0 },
    { champion: "Thresh", games: 8, winRate: 62.5 },
    { champion: "Rakan", games: 7, winRate: 71.4 },
    { champion: "Alistar", games: 6, winRate: 66.7 },
    { champion: "Renata Glasc", games: 5, winRate: 60.0 },
  ],
};

// Generic enemy player pool data
const ENEMY_PLAYER_POOLS: Record<
  string,
  { champion: string; games: number; winRate: number }[]
> = {
  TOP: [
    { champion: "K'Sante", games: 8, winRate: 65.0 },
    { champion: "Jax", games: 7, winRate: 60.0 },
    { champion: "Aatrox", games: 6, winRate: 55.0 },
  ],
  JGL: [
    { champion: "Viego", games: 9, winRate: 62.0 },
    { champion: "Lee Sin", games: 7, winRate: 58.0 },
    { champion: "Jarvan IV", games: 5, winRate: 55.0 },
  ],
  MID: [
    { champion: "Azir", games: 10, winRate: 68.0 },
    { champion: "Syndra", games: 8, winRate: 60.0 },
    { champion: "LeBlanc", games: 6, winRate: 55.0 },
  ],
  ADC: [
    { champion: "Aphelios", games: 9, winRate: 65.0 },
    { champion: "Jinx", games: 8, winRate: 60.0 },
    { champion: "Kai'Sa", games: 6, winRate: 58.0 },
  ],
  SUP: [
    { champion: "Thresh", games: 10, winRate: 62.0 },
    { champion: "Nautilus", games: 7, winRate: 58.0 },
    { champion: "Rakan", games: 5, winRate: 55.0 },
  ],
};

interface DraftState {
  // Team states
  blueTeam: TeamDraft;
  redTeam: TeamDraft;

  // Draft progress
  currentStep: number;
  isComplete: boolean;

  // Selection state
  selectedChampion: Champion | null;
  hoveredChampion: Champion | null;

  // Champion pool
  availableChampions: Champion[];

  // Action history
  actions: DraftAction[];

  // UI state
  searchQuery: string;
  roleFilter: Role | null;

  // Analytics state
  recommendations: Recommendation[];
  blueTeamAnalysis: TeamAnalysis | null;
  redTeamAnalysis: TeamAnalysis | null;
  isConnected: boolean;
  roomId: string | null;
  myTeam: Team;
}

interface DraftStore extends DraftState {
  // Initialization
  setAvailableChampions: (champions: Champion[]) => void;
  initializeTeams: (
    c9Side: "blue" | "red",
    c9Players: Player[],
    enemyTeam: EnemyTeam,
  ) => void;

  // Selection
  selectChampion: (champion: Champion) => void;
  hoverChampion: (champion: Champion | null) => void;
  confirmSelection: () => void;

  // Draft flow
  undo: () => void;
  reset: () => void;

  // UI
  setSearchQuery: (query: string) => void;
  setRoleFilter: (role: Role | null) => void;

  // Analytics
  setRecommendations: (recommendations: Recommendation[]) => void;
  setTeamAnalysis: (
    blue: TeamAnalysis | null,
    red: TeamAnalysis | null,
  ) => void;
  setConnectionState: (
    isConnected: boolean,
    roomId?: string | null,
    team?: Team,
  ) => void;

  // Computed helpers
  getCurrentStep: () => DraftStep | null;
  isChampionAvailable: (championId: string) => boolean;
  getBannedChampionIds: () => string[];
  getPickedChampionIds: () => string[];
  getFilteredChampions: () => Champion[];
}

const createEmptyTeam = (
  name: string,
  players: DraftPlayer[] = [],
): TeamDraft => ({
  name,
  bans: [null, null, null, null, null],
  picks: [null, null, null, null, null],
  players,
});

const initialState: DraftState = {
  blueTeam: createEmptyTeam("Blue Team"),
  redTeam: createEmptyTeam("Red Team"),
  currentStep: 0,
  isComplete: false,
  selectedChampion: null,
  hoveredChampion: null,
  availableChampions: [],
  actions: [],
  searchQuery: "",
  roleFilter: null,
  recommendations: [],
  blueTeamAnalysis: null,
  redTeamAnalysis: null,
  isConnected: false,
  roomId: null,
  myTeam: "blue",
};

export const useDraftStore = create<DraftStore>((set, get) => ({
  ...initialState,

  setAvailableChampions: (champions: Champion[]) =>
    set({ availableChampions: champions }),

  initializeTeams: (
    c9Side: "blue" | "red",
    c9Players: Player[],
    enemyTeam: EnemyTeam,
  ) => {
    const c9TeamName = "Cloud9";
    const enemyTeamName = enemyTeam.name;

    // Convert C9 players to draft players with champion pools
    const c9DraftPlayers: DraftPlayer[] = c9Players.map((player) => ({
      id: player.id,
      name: player.name,
      role: player.role as Role,
      championPool: C9_PLAYER_POOLS[player.id] || [],
    }));

    // Convert enemy players to draft players with generic champion pools
    const enemyDraftPlayers: DraftPlayer[] = enemyTeam.players.map(
      (player) => ({
        id: player.id,
        name: player.name,
        role: player.role as Role,
        championPool: ENEMY_PLAYER_POOLS[player.role] || [],
      }),
    );

    if (c9Side === "blue") {
      set({
        blueTeam: createEmptyTeam(c9TeamName, c9DraftPlayers),
        redTeam: createEmptyTeam(enemyTeamName, enemyDraftPlayers),
        myTeam: "blue",
      });
    } else {
      set({
        blueTeam: createEmptyTeam(enemyTeamName, enemyDraftPlayers),
        redTeam: createEmptyTeam(c9TeamName, c9DraftPlayers),
        myTeam: "red",
      });
    }
  },

  selectChampion: (champion: Champion) => {
    const state = get();
    if (!state.isChampionAvailable(champion.id)) return;
    set({ selectedChampion: champion });
  },

  hoverChampion: (champion: Champion | null) =>
    set({ hoveredChampion: champion }),

  confirmSelection: () => {
    const state = get();
    const { selectedChampion, currentStep } = state;

    if (!selectedChampion) return;
    if (isDraftComplete(currentStep)) return;

    const step = getCurrentDraftStep(currentStep);
    if (!step) return;

    const { team, type } = step;
    const teamKey = team === "blue" ? "blueTeam" : "redTeam";
    const teamData = state[teamKey];

    // Find the next empty slot
    const slots = type === "ban" ? teamData.bans : teamData.picks;
    const slotIndex = slots.findIndex((s) => s === null);

    if (slotIndex === -1) return;

    // Create new slots array
    const newSlots = [...slots];
    newSlots[slotIndex] = selectedChampion;

    // Create action record
    const action: DraftAction = {
      step: currentStep,
      team,
      type,
      champion: selectedChampion,
      timestamp: Date.now(),
    };

    // Update state
    set({
      [teamKey]: {
        ...teamData,
        [type === "ban" ? "bans" : "picks"]: newSlots,
      },
      currentStep: currentStep + 1,
      isComplete: isDraftComplete(currentStep + 1),
      selectedChampion: null,
      actions: [...state.actions, action],
    });
  },

  undo: () => {
    const state = get();
    const { actions, currentStep } = state;

    if (actions.length === 0 || currentStep === 0) return;

    const lastAction = actions[actions.length - 1];
    const { team, type, champion } = lastAction;

    const teamKey = team === "blue" ? "blueTeam" : "redTeam";
    const teamData = state[teamKey];

    // Remove champion from slot
    const slots = type === "ban" ? teamData.bans : teamData.picks;
    const slotIndex = slots.findIndex((s) => s?.id === champion?.id);

    if (slotIndex === -1) return;

    const newSlots = [...slots];
    newSlots[slotIndex] = null;

    set({
      [teamKey]: {
        ...teamData,
        [type === "ban" ? "bans" : "picks"]: newSlots,
      },
      currentStep: currentStep - 1,
      isComplete: false,
      actions: actions.slice(0, -1),
    });
  },

  reset: () =>
    set({
      ...initialState,
      availableChampions: get().availableChampions,
    }),

  setSearchQuery: (query: string) => set({ searchQuery: query }),

  setRoleFilter: (role: Role | null) => set({ roleFilter: role }),

  // Analytics
  setRecommendations: (recommendations: Recommendation[]) =>
    set({ recommendations }),

  setTeamAnalysis: (blue: TeamAnalysis | null, red: TeamAnalysis | null) =>
    set({ blueTeamAnalysis: blue, redTeamAnalysis: red }),

  setConnectionState: (
    isConnected: boolean,
    roomId?: string | null,
    team?: Team,
  ) =>
    set({
      isConnected,
      ...(roomId !== undefined && { roomId }),
      ...(team !== undefined && { myTeam: team }),
    }),

  // Computed helpers
  getCurrentStep: () => {
    const { currentStep } = get();
    return getCurrentDraftStep(currentStep);
  },

  isChampionAvailable: (championId: string) => {
    const state = get();
    const bannedIds = state.getBannedChampionIds();
    const pickedIds = state.getPickedChampionIds();
    return !bannedIds.includes(championId) && !pickedIds.includes(championId);
  },

  getBannedChampionIds: () => {
    const { blueTeam, redTeam } = get();
    const blueBans = blueTeam.bans.filter((c) => c !== null).map((c) => c!.id);
    const redBans = redTeam.bans.filter((c) => c !== null).map((c) => c!.id);
    return [...blueBans, ...redBans];
  },

  getPickedChampionIds: () => {
    const { blueTeam, redTeam } = get();
    const bluePicks = blueTeam.picks
      .filter((c) => c !== null)
      .map((c) => c!.id);
    const redPicks = redTeam.picks.filter((c) => c !== null).map((c) => c!.id);
    return [...bluePicks, ...redPicks];
  },

  getFilteredChampions: () => {
    const { availableChampions, searchQuery, roleFilter } = get();

    return availableChampions.filter((champion) => {
      // Search filter
      const matchesSearch =
        searchQuery === "" ||
        champion.name.toLowerCase().includes(searchQuery.toLowerCase());

      // Role filter
      const matchesRole =
        roleFilter === null || champion.roles.includes(roleFilter);

      return matchesSearch && matchesRole;
    });
  },
}));
