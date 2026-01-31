import type { DraftStep, Team, DraftPhase } from '../types/draft.types';

/**
 * Standard League of Legends Pro Play Draft Sequence
 *
 * Ban Phase 1: B-R-R-B-B-R (6 bans)
 * Pick Phase 1: B-R-R-B-B-R (6 picks)
 * Ban Phase 2: R-B-B-R (4 bans)
 * Pick Phase 2: R-B-B-R (4 picks)
 *
 * Total: 20 actions (10 bans, 10 picks)
 */

export const DRAFT_SEQUENCE: DraftStep[] = [
  // Ban Phase 1
  { step: 0, phase: 'ban1', team: 'blue', type: 'ban', label: 'Blue Ban 1' },
  { step: 1, phase: 'ban1', team: 'red', type: 'ban', label: 'Red Ban 1' },
  { step: 2, phase: 'ban1', team: 'red', type: 'ban', label: 'Red Ban 2' },
  { step: 3, phase: 'ban1', team: 'blue', type: 'ban', label: 'Blue Ban 2' },
  { step: 4, phase: 'ban1', team: 'blue', type: 'ban', label: 'Blue Ban 3' },
  { step: 5, phase: 'ban1', team: 'red', type: 'ban', label: 'Red Ban 3' },

  // Pick Phase 1
  { step: 6, phase: 'pick1', team: 'blue', type: 'pick', label: 'Blue Pick 1' },
  { step: 7, phase: 'pick1', team: 'red', type: 'pick', label: 'Red Pick 1' },
  { step: 8, phase: 'pick1', team: 'red', type: 'pick', label: 'Red Pick 2' },
  { step: 9, phase: 'pick1', team: 'blue', type: 'pick', label: 'Blue Pick 2' },
  { step: 10, phase: 'pick1', team: 'blue', type: 'pick', label: 'Blue Pick 3' },
  { step: 11, phase: 'pick1', team: 'red', type: 'pick', label: 'Red Pick 3' },

  // Ban Phase 2
  { step: 12, phase: 'ban2', team: 'red', type: 'ban', label: 'Red Ban 4' },
  { step: 13, phase: 'ban2', team: 'blue', type: 'ban', label: 'Blue Ban 4' },
  { step: 14, phase: 'ban2', team: 'blue', type: 'ban', label: 'Blue Ban 5' },
  { step: 15, phase: 'ban2', team: 'red', type: 'ban', label: 'Red Ban 5' },

  // Pick Phase 2
  { step: 16, phase: 'pick2', team: 'red', type: 'pick', label: 'Red Pick 4' },
  { step: 17, phase: 'pick2', team: 'blue', type: 'pick', label: 'Blue Pick 4' },
  { step: 18, phase: 'pick2', team: 'blue', type: 'pick', label: 'Blue Pick 5' },
  { step: 19, phase: 'pick2', team: 'red', type: 'pick', label: 'Red Pick 5' },
];

export const TOTAL_STEPS = DRAFT_SEQUENCE.length;

export function getCurrentDraftStep(step: number): DraftStep | null {
  if (step < 0 || step >= TOTAL_STEPS) {
    return null;
  }
  return DRAFT_SEQUENCE[step];
}

export function getPhaseLabel(phase: DraftPhase): string {
  switch (phase) {
    case 'ban1':
      return 'Ban Phase 1';
    case 'pick1':
      return 'Pick Phase 1';
    case 'ban2':
      return 'Ban Phase 2';
    case 'pick2':
      return 'Pick Phase 2';
    case 'complete':
      return 'Draft Complete';
    default:
      return '';
  }
}

export function getTeamLabel(team: Team): string {
  return team === 'blue' ? 'Blue Team' : 'Red Team';
}

export function getActionLabel(type: 'ban' | 'pick'): string {
  return type === 'ban' ? 'Ban' : 'Pick';
}

export function isDraftComplete(step: number): boolean {
  return step >= TOTAL_STEPS;
}

export function getProgressPercentage(step: number): number {
  return Math.min((step / TOTAL_STEPS) * 100, 100);
}

/**
 * Get the index in the team's ban/pick array for the current step
 */
export function getTeamSlotIndex(step: number): { banIndex: number; pickIndex: number } {
  const draftStep = getCurrentDraftStep(step);
  if (!draftStep) {
    return { banIndex: -1, pickIndex: -1 };
  }

  let banIndex = -1;
  let pickIndex = -1;

  // Count how many bans/picks this team has made before this step
  for (let i = 0; i <= step; i++) {
    const s = DRAFT_SEQUENCE[i];
    if (s.team === draftStep.team) {
      if (s.type === 'ban') {
        banIndex++;
      } else {
        pickIndex++;
      }
    }
  }

  return { banIndex, pickIndex };
}

/**
 * Get all steps for a specific team
 */
export function getTeamSteps(team: Team): DraftStep[] {
  return DRAFT_SEQUENCE.filter(step => step.team === team);
}

/**
 * Get all ban steps
 */
export function getBanSteps(): DraftStep[] {
  return DRAFT_SEQUENCE.filter(step => step.type === 'ban');
}

/**
 * Get all pick steps
 */
export function getPickSteps(): DraftStep[] {
  return DRAFT_SEQUENCE.filter(step => step.type === 'pick');
}
