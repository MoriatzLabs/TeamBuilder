import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  DraftState,
  Champion,
  Team,
  DraftPhase,
  Role,
  Player,
} from './types/analytics.types';

// Draft sequence for LoL pro play (20 steps total)
const DRAFT_SEQUENCE: { team: Team; type: 'ban' | 'pick' }[] = [
  // Ban Phase 1 (6 bans)
  { team: 'blue', type: 'ban' },
  { team: 'red', type: 'ban' },
  { team: 'blue', type: 'ban' },
  { team: 'red', type: 'ban' },
  { team: 'blue', type: 'ban' },
  { team: 'red', type: 'ban' },
  // Pick Phase 1 (6 picks)
  { team: 'blue', type: 'pick' },
  { team: 'red', type: 'pick' },
  { team: 'red', type: 'pick' },
  { team: 'blue', type: 'pick' },
  { team: 'blue', type: 'pick' },
  { team: 'red', type: 'pick' },
  // Ban Phase 2 (4 bans)
  { team: 'red', type: 'ban' },
  { team: 'blue', type: 'ban' },
  { team: 'red', type: 'ban' },
  { team: 'blue', type: 'ban' },
  // Pick Phase 2 (4 picks)
  { team: 'red', type: 'pick' },
  { team: 'blue', type: 'pick' },
  { team: 'blue', type: 'pick' },
  { team: 'red', type: 'pick' },
];

@Injectable()
export class DraftService {
  private readonly logger = new Logger(DraftService.name);
  private rooms: Map<string, DraftState> = new Map();
  private selectedChampions: Map<string, Champion | null> = new Map();

  createRoom(
    blueTeamName: string,
    redTeamName: string,
    bluePlayers: Player[],
    redPlayers: Player[],
  ): DraftState {
    const roomId = uuidv4();

    const state: DraftState = {
      roomId,
      blueTeam: {
        name: blueTeamName,
        players: bluePlayers,
        bans: [null, null, null, null, null],
        picks: [null, null, null, null, null],
      },
      redTeam: {
        name: redTeamName,
        players: redPlayers,
        bans: [null, null, null, null, null],
        picks: [null, null, null, null, null],
      },
      currentStep: 0,
      isComplete: false,
      phase: 'ban1',
      currentTeam: 'blue',
    };

    this.rooms.set(roomId, state);
    this.selectedChampions.set(roomId, null);
    this.logger.log(`Room created: ${roomId}`);

    return state;
  }

  getRoom(roomId: string): DraftState | null {
    return this.rooms.get(roomId) || null;
  }

  getSelectedChampion(roomId: string): Champion | null {
    return this.selectedChampions.get(roomId) || null;
  }

  selectChampion(roomId: string, champion: Champion): boolean {
    const state = this.rooms.get(roomId);
    if (!state || state.isComplete) return false;

    // Check if champion is available
    if (!this.isChampionAvailable(roomId, champion.id)) {
      this.logger.warn(`Champion ${champion.name} is not available`);
      return false;
    }

    this.selectedChampions.set(roomId, champion);
    return true;
  }

  lockIn(roomId: string): { success: boolean; state: DraftState | null } {
    const state = this.rooms.get(roomId);
    const selectedChampion = this.selectedChampions.get(roomId);

    if (!state || state.isComplete) {
      return { success: false, state: null };
    }

    if (!selectedChampion) {
      this.logger.warn('No champion selected to lock in');
      return { success: false, state: null };
    }

    const currentAction = DRAFT_SEQUENCE[state.currentStep];
    if (!currentAction) {
      return { success: false, state: null };
    }

    const { team, type } = currentAction;

    if (type === 'ban') {
      const banIndex =
        team === 'blue'
          ? state.blueTeam.bans.findIndex((b) => b === null)
          : state.redTeam.bans.findIndex((b) => b === null);

      if (banIndex !== -1) {
        if (team === 'blue') {
          state.blueTeam.bans[banIndex] = selectedChampion;
        } else {
          state.redTeam.bans[banIndex] = selectedChampion;
        }
      }
    } else {
      const pickIndex =
        team === 'blue'
          ? state.blueTeam.picks.findIndex((p) => p === null)
          : state.redTeam.picks.findIndex((p) => p === null);

      if (pickIndex !== -1) {
        if (team === 'blue') {
          state.blueTeam.picks[pickIndex] = selectedChampion;
        } else {
          state.redTeam.picks[pickIndex] = selectedChampion;
        }
      }
    }

    // Move to next step
    state.currentStep++;
    this.selectedChampions.set(roomId, null);

    // Update phase and check completion
    this.updatePhase(state);

    this.logger.log(
      `Locked in ${selectedChampion.name} for ${team} team (${type})`,
    );

    return { success: true, state };
  }

  undo(roomId: string): DraftState | null {
    const state = this.rooms.get(roomId);
    if (!state || state.currentStep === 0) return null;

    state.currentStep--;
    const prevAction = DRAFT_SEQUENCE[state.currentStep];

    if (prevAction.type === 'ban') {
      if (prevAction.team === 'blue') {
        const lastBanIndex = state.blueTeam.bans.findLastIndex(
          (b) => b !== null,
        );
        if (lastBanIndex !== -1) state.blueTeam.bans[lastBanIndex] = null;
      } else {
        const lastBanIndex = state.redTeam.bans.findLastIndex(
          (b) => b !== null,
        );
        if (lastBanIndex !== -1) state.redTeam.bans[lastBanIndex] = null;
      }
    } else {
      if (prevAction.team === 'blue') {
        const lastPickIndex = state.blueTeam.picks.findLastIndex(
          (p) => p !== null,
        );
        if (lastPickIndex !== -1) state.blueTeam.picks[lastPickIndex] = null;
      } else {
        const lastPickIndex = state.redTeam.picks.findLastIndex(
          (p) => p !== null,
        );
        if (lastPickIndex !== -1) state.redTeam.picks[lastPickIndex] = null;
      }
    }

    state.isComplete = false;
    this.updatePhase(state);
    this.selectedChampions.set(roomId, null);

    return state;
  }

  reset(roomId: string): DraftState | null {
    const state = this.rooms.get(roomId);
    if (!state) return null;

    state.currentStep = 0;
    state.isComplete = false;
    state.phase = 'ban1';
    state.currentTeam = 'blue';
    state.blueTeam.bans = [null, null, null, null, null];
    state.blueTeam.picks = [null, null, null, null, null];
    state.redTeam.bans = [null, null, null, null, null];
    state.redTeam.picks = [null, null, null, null, null];
    this.selectedChampions.set(roomId, null);

    return state;
  }

  isChampionAvailable(roomId: string, championId: string): boolean {
    const state = this.rooms.get(roomId);
    if (!state) return false;

    const allBans = [...state.blueTeam.bans, ...state.redTeam.bans]
      .filter(Boolean)
      .map((c) => c!.id);
    const allPicks = [...state.blueTeam.picks, ...state.redTeam.picks]
      .filter(Boolean)
      .map((c) => c!.id);

    return (
      !allBans.includes(championId) &&
      !allPicks.includes(championId.toLowerCase())
    );
  }

  getCurrentStep(roomId: string): { team: Team; type: 'ban' | 'pick' } | null {
    const state = this.rooms.get(roomId);
    if (!state || state.isComplete) return null;
    return DRAFT_SEQUENCE[state.currentStep] || null;
  }

  getRoleNeeded(roomId: string, team: Team): Role | null {
    const state = this.rooms.get(roomId);
    if (!state) return null;

    const currentStep = DRAFT_SEQUENCE[state.currentStep];
    if (!currentStep || currentStep.type !== 'pick') return null;

    const picks =
      team === 'blue' ? state.blueTeam.picks : state.redTeam.picks;
    const players =
      team === 'blue' ? state.blueTeam.players : state.redTeam.players;
    const filledCount = picks.filter(Boolean).length;

    // Return the role of the next player to pick
    if (filledCount < players.length) {
      return players[filledCount]?.role || null;
    }

    return null;
  }

  getFilledRoles(roomId: string, team: Team): Role[] {
    const state = this.rooms.get(roomId);
    if (!state) return [];

    const picks =
      team === 'blue' ? state.blueTeam.picks : state.redTeam.picks;
    const players =
      team === 'blue' ? state.blueTeam.players : state.redTeam.players;

    const filledRoles: Role[] = [];
    picks.forEach((pick, index) => {
      if (pick && players[index]) {
        filledRoles.push(players[index].role);
      }
    });

    return filledRoles;
  }

  private updatePhase(state: DraftState): void {
    const step = state.currentStep;

    if (step >= 20) {
      state.isComplete = true;
      state.phase = 'complete';
      return;
    }

    const action = DRAFT_SEQUENCE[step];
    state.currentTeam = action.team;

    if (step < 6) {
      state.phase = 'ban1';
    } else if (step < 12) {
      state.phase = 'pick1';
    } else if (step < 16) {
      state.phase = 'ban2';
    } else {
      state.phase = 'pick2';
    }
  }

  deleteRoom(roomId: string): void {
    this.rooms.delete(roomId);
    this.selectedChampions.delete(roomId);
    this.logger.log(`Room deleted: ${roomId}`);
  }
}
