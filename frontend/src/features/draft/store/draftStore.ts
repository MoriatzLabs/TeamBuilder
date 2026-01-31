import { create } from "zustand";
import type {
  Champion,
  Role,
  DraftAction,
  TeamDraft,
  DraftStep,
} from "../types/draft.types";
import { getCurrentDraftStep, isDraftComplete } from "../utils/draftSequence";

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
}

interface DraftStore extends DraftState {
  // Initialization
  setAvailableChampions: (champions: Champion[]) => void;

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

  // Computed helpers
  getCurrentStep: () => DraftStep | null;
  isChampionAvailable: (championId: string) => boolean;
  getBannedChampionIds: () => string[];
  getPickedChampionIds: () => string[];
  getFilteredChampions: () => Champion[];
}

const createEmptyTeam = (name: string): TeamDraft => ({
  name,
  bans: [null, null, null, null, null],
  picks: [null, null, null, null, null],
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
};

export const useDraftStore = create<DraftStore>((set, get) => ({
  ...initialState,

  setAvailableChampions: (champions: Champion[]) =>
    set({ availableChampions: champions }),

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
