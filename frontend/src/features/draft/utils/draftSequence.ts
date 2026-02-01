import type { DraftStep, Team, DraftPhase } from "../types/draft.types";
import type { DraftConfig2026 } from "@/store/appStore";

/**
 * 2026 League of Legends Pro Play Draft Sequence
 *
 * NEW IN 2026: Teams can choose either SIDE or PICK ORDER
 * - If Team A chooses side (blue/red), Team B chooses pick order (first/last)
 * - If Team A chooses pick order, Team B chooses side
 *
 * This breaks the old meta where Blue side ALWAYS had first pick.
 * Now Red side can have first pick if configured that way.
 *
 * Standard sequence pattern (relative to first-pick team):
 * Ban Phase 1: 1st-2nd-2nd-1st-1st-2nd (6 bans)
 * Pick Phase 1: 1st-2nd-2nd-1st-1st-2nd (6 picks)
 * Ban Phase 2: 2nd-1st-1st-2nd (4 bans)
 * Pick Phase 2: 2nd-1st-1st-2nd (4 picks)
 *
 * Total: 20 actions (10 bans, 10 picks)
 */

// Legacy sequence for backwards compatibility (Blue = First Pick)
export const DRAFT_SEQUENCE: DraftStep[] = [
  // Ban Phase 1
  { step: 0, phase: "ban1", team: "blue", type: "ban", label: "Blue Ban 1" },
  { step: 1, phase: "ban1", team: "red", type: "ban", label: "Red Ban 1" },
  { step: 2, phase: "ban1", team: "red", type: "ban", label: "Red Ban 2" },
  { step: 3, phase: "ban1", team: "blue", type: "ban", label: "Blue Ban 2" },
  { step: 4, phase: "ban1", team: "blue", type: "ban", label: "Blue Ban 3" },
  { step: 5, phase: "ban1", team: "red", type: "ban", label: "Red Ban 3" },

  // Pick Phase 1
  { step: 6, phase: "pick1", team: "blue", type: "pick", label: "Blue Pick 1" },
  { step: 7, phase: "pick1", team: "red", type: "pick", label: "Red Pick 1" },
  { step: 8, phase: "pick1", team: "red", type: "pick", label: "Red Pick 2" },
  { step: 9, phase: "pick1", team: "blue", type: "pick", label: "Blue Pick 2" },
  {
    step: 10,
    phase: "pick1",
    team: "blue",
    type: "pick",
    label: "Blue Pick 3",
  },
  { step: 11, phase: "pick1", team: "red", type: "pick", label: "Red Pick 3" },

  // Ban Phase 2
  { step: 12, phase: "ban2", team: "red", type: "ban", label: "Red Ban 4" },
  { step: 13, phase: "ban2", team: "blue", type: "ban", label: "Blue Ban 4" },
  { step: 14, phase: "ban2", team: "blue", type: "ban", label: "Blue Ban 5" },
  { step: 15, phase: "ban2", team: "red", type: "ban", label: "Red Ban 5" },

  // Pick Phase 2
  { step: 16, phase: "pick2", team: "red", type: "pick", label: "Red Pick 4" },
  {
    step: 17,
    phase: "pick2",
    team: "blue",
    type: "pick",
    label: "Blue Pick 4",
  },
  {
    step: 18,
    phase: "pick2",
    team: "blue",
    type: "pick",
    label: "Blue Pick 5",
  },
  { step: 19, phase: "pick2", team: "red", type: "pick", label: "Red Pick 5" },
];

/**
 * Generates a draft sequence based on 2026 rules
 * @param firstPickTeam - Which side (blue/red) has first pick
 * @returns The draft sequence with teams assigned based on pick order
 */
export function generateDraftSequence2026(firstPickTeam: Team): DraftStep[] {
  const secondPickTeam: Team = firstPickTeam === "blue" ? "red" : "blue";

  // Pattern: which position in the sequence picks (1 = first pick team, 2 = second pick team)
  const banPhase1Pattern = [1, 2, 2, 1, 1, 2]; // 6 bans
  const pickPhase1Pattern = [1, 2, 2, 1, 1, 2]; // 6 picks
  const banPhase2Pattern = [2, 1, 1, 2]; // 4 bans
  const pickPhase2Pattern = [2, 1, 1, 2]; // 4 picks

  const getTeam = (position: number): Team =>
    position === 1 ? firstPickTeam : secondPickTeam;
  const getLabel = (
    team: Team,
    type: "ban" | "pick",
    count: number,
  ): string => {
    const teamName = team === "blue" ? "Blue" : "Red";
    const actionName = type === "ban" ? "Ban" : "Pick";
    return `${teamName} ${actionName} ${count}`;
  };

  const sequence: DraftStep[] = [];
  let stepIndex = 0;

  // Track ban/pick counts per team
  const counts = {
    blue: { ban: 0, pick: 0 },
    red: { ban: 0, pick: 0 },
  };

  // Ban Phase 1
  banPhase1Pattern.forEach((pos) => {
    const team = getTeam(pos);
    counts[team].ban++;
    sequence.push({
      step: stepIndex++,
      phase: "ban1",
      team,
      type: "ban",
      label: getLabel(team, "ban", counts[team].ban),
    });
  });

  // Pick Phase 1
  pickPhase1Pattern.forEach((pos) => {
    const team = getTeam(pos);
    counts[team].pick++;
    sequence.push({
      step: stepIndex++,
      phase: "pick1",
      team,
      type: "pick",
      label: getLabel(team, "pick", counts[team].pick),
    });
  });

  // Ban Phase 2
  banPhase2Pattern.forEach((pos) => {
    const team = getTeam(pos);
    counts[team].ban++;
    sequence.push({
      step: stepIndex++,
      phase: "ban2",
      team,
      type: "ban",
      label: getLabel(team, "ban", counts[team].ban),
    });
  });

  // Pick Phase 2
  pickPhase2Pattern.forEach((pos) => {
    const team = getTeam(pos);
    counts[team].pick++;
    sequence.push({
      step: stepIndex++,
      phase: "pick2",
      team,
      type: "pick",
      label: getLabel(team, "pick", counts[team].pick),
    });
  });

  return sequence;
}

/**
 * Determines which team has first pick based on 2026 draft configuration
 */
export function getFirstPickTeam(config: DraftConfig2026): Team {
  if (config.c9ChoiceType === "side") {
    // C9 chose side, opponent chose pick order
    // If opponent chose "first", opponent picks first
    // Opponent is on the opposite side of C9
    if (config.opponentPickOrder === "first") {
      return config.opponentSide!;
    } else {
      return config.c9Side!;
    }
  } else {
    // C9 chose pick order, opponent chose side
    if (config.c9PickOrder === "first") {
      return config.c9Side!;
    } else {
      return config.opponentSide!;
    }
  }
}

/**
 * Creates a draft sequence from a 2026 configuration
 */
export function createDraftSequenceFromConfig(
  config: DraftConfig2026,
): DraftStep[] {
  const firstPickTeam = getFirstPickTeam(config);
  return generateDraftSequence2026(firstPickTeam);
}

export const TOTAL_STEPS = DRAFT_SEQUENCE.length;

// Allow storing a custom sequence for 2026 mode
let activeDraftSequence: DraftStep[] = DRAFT_SEQUENCE;

export function setActiveDraftSequence(sequence: DraftStep[]): void {
  activeDraftSequence = sequence;
}

export function getActiveDraftSequence(): DraftStep[] {
  return activeDraftSequence;
}

export function resetToDefaultSequence(): void {
  activeDraftSequence = DRAFT_SEQUENCE;
}

export function getCurrentDraftStep(step: number): DraftStep | null {
  if (step < 0 || step >= activeDraftSequence.length) {
    return null;
  }
  return activeDraftSequence[step];
}

export function getTotalSteps(): number {
  return activeDraftSequence.length;
}

export function getPhaseLabel(phase: DraftPhase): string {
  switch (phase) {
    case "ban1":
      return "Ban Phase 1";
    case "pick1":
      return "Pick Phase 1";
    case "ban2":
      return "Ban Phase 2";
    case "pick2":
      return "Pick Phase 2";
    case "complete":
      return "Draft Complete";
    default:
      return "";
  }
}

export function getTeamLabel(team: Team): string {
  return team === "blue" ? "Blue Team" : "Red Team";
}

export function getActionLabel(type: "ban" | "pick"): string {
  return type === "ban" ? "Ban" : "Pick";
}

export function isDraftComplete(step: number): boolean {
  return step >= getTotalSteps();
}

export function getProgressPercentage(step: number): number {
  return Math.min((step / getTotalSteps()) * 100, 100);
}

/**
 * Get the index in the team's ban/pick array for the current step
 */
export function getTeamSlotIndex(step: number): {
  banIndex: number;
  pickIndex: number;
} {
  const draftStep = getCurrentDraftStep(step);
  if (!draftStep) {
    return { banIndex: -1, pickIndex: -1 };
  }

  let banIndex = -1;
  let pickIndex = -1;

  const sequence = getActiveDraftSequence();

  // Count how many bans/picks this team has made before this step
  for (let i = 0; i <= step; i++) {
    const s = sequence[i];
    if (s.team === draftStep.team) {
      if (s.type === "ban") {
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
  return getActiveDraftSequence().filter((step) => step.team === team);
}

/**
 * Get all ban steps
 */
export function getBanSteps(): DraftStep[] {
  return getActiveDraftSequence().filter((step) => step.type === "ban");
}

/**
 * Get all pick steps
 */
export function getPickSteps(): DraftStep[] {
  return getActiveDraftSequence().filter((step) => step.type === "pick");
}
