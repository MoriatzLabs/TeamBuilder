import { CompositionType, PowerSpike, Champion } from '../types/analytics.types';
import { CHAMPION_META, ChampionMeta } from './matchups';

export interface CompositionAnalysis {
  type: CompositionType;
  strengths: string[];
  weaknesses: string[];
  powerSpikes: PowerSpike[];
  damageProfile: {
    ap: number;
    ad: number;
    true: number;
  };
  engageLevel: number;
  peelLevel: number;
  waveclearLevel: number;
}

// Composition archetypes with their characteristics
export const COMPOSITION_TEMPLATES: Record<
  CompositionType,
  {
    requiredTags: string[];
    optionalTags: string[];
    strengthKeywords: string[];
    weaknessKeywords: string[];
  }
> = {
  teamfight: {
    requiredTags: ['teamfight', 'engage', 'aoe'],
    optionalTags: ['wombo-combo', 'zone-control'],
    strengthKeywords: [
      'Strong 5v5 teamfighting',
      'Good AoE damage',
      'Multiple engage tools',
    ],
    weaknessKeywords: [
      'Weak to split push',
      'Needs to group',
      'Can be outmaneuvered',
    ],
  },
  poke: {
    requiredTags: ['poke', 'siege', 'ranged'],
    optionalTags: ['waveclear', 'disengage'],
    strengthKeywords: [
      'Strong siege potential',
      'Can chunk before fights',
      'Good objective control',
    ],
    weaknessKeywords: [
      'Weak to hard engage',
      'Struggles vs sustain',
      'Needs good spacing',
    ],
  },
  pick: {
    requiredTags: ['pick', 'assassin', 'catch'],
    optionalTags: ['burst', 'mobility'],
    strengthKeywords: [
      'Can catch isolated targets',
      'Strong skirmishing',
      'Good vision control',
    ],
    weaknessKeywords: [
      'Weak 5v5 teamfighting',
      'Needs picks to win',
      'Falls behind if no picks',
    ],
  },
  split: {
    requiredTags: ['splitpush', 'duelist', '1v1'],
    optionalTags: ['tower-taking', 'waveclear'],
    strengthKeywords: [
      'Strong 1-3-1 or 1-4',
      'Creates map pressure',
      'Strong sidelane duelists',
    ],
    weaknessKeywords: [
      'Requires coordination',
      'Weak if grouped 5v5',
      'Can lose objectives',
    ],
  },
  mixed: {
    requiredTags: [],
    optionalTags: [],
    strengthKeywords: ['Flexible win conditions', 'Well-rounded composition'],
    weaknessKeywords: ['Jack of all trades', 'May lack identity'],
  },
};

export function analyzeTeamComposition(
  picks: (Champion | null)[],
): CompositionAnalysis {
  const validPicks = picks.filter(Boolean) as Champion[];

  if (validPicks.length === 0) {
    return {
      type: 'mixed',
      strengths: [],
      weaknesses: [],
      powerSpikes: [],
      damageProfile: { ap: 0, ad: 0, true: 0 },
      engageLevel: 0,
      peelLevel: 0,
      waveclearLevel: 0,
    };
  }

  // Get metadata for each champion
  const metas = validPicks
    .map((p) => CHAMPION_META[p.id.toLowerCase()])
    .filter(Boolean);

  // Calculate damage profile
  let apCount = 0;
  let adCount = 0;
  let trueCount = 0;

  validPicks.forEach((pick) => {
    const meta = CHAMPION_META[pick.id.toLowerCase()];
    if (meta) {
      if (meta.damageType === 'ap') apCount++;
      else if (meta.damageType === 'ad') adCount++;
      else if (meta.damageType === 'true') trueCount++;
      else if (meta.damageType === 'mixed') {
        apCount += 0.5;
        adCount += 0.5;
      }
    }
  });

  const total = apCount + adCount + trueCount || 1;
  const damageProfile = {
    ap: Math.round((apCount / total) * 100),
    ad: Math.round((adCount / total) * 100),
    true: Math.round((trueCount / total) * 100),
  };

  // Calculate team ratings
  const engageLevel = Math.round(
    (metas.reduce((sum, m) => sum + m.engageRating, 0) / metas.length) * 10,
  );
  const peelLevel = Math.round(
    (metas.reduce((sum, m) => sum + m.peelRating, 0) / metas.length) * 10,
  );
  const waveclearLevel = Math.round(
    (metas.reduce((sum, m) => sum + m.waveclearRating, 0) / metas.length) * 10,
  );

  // Determine power spikes
  const avgEarly =
    metas.reduce((sum, m) => sum + m.earlyGame, 0) / metas.length;
  const avgMid = metas.reduce((sum, m) => sum + m.midGame, 0) / metas.length;
  const avgLate = metas.reduce((sum, m) => sum + m.lateGame, 0) / metas.length;

  const powerSpikes: PowerSpike[] = [];
  if (avgEarly >= 7) powerSpikes.push('early');
  if (avgMid >= 7) powerSpikes.push('mid');
  if (avgLate >= 7) powerSpikes.push('late');

  // Determine composition type based on tags
  const allTags = metas.flatMap((m) => m.tags);
  let compType: CompositionType = 'mixed';
  let maxScore = 0;

  for (const [type, template] of Object.entries(COMPOSITION_TEMPLATES)) {
    if (type === 'mixed') continue;
    const reqMatches = template.requiredTags.filter((t) =>
      allTags.includes(t),
    ).length;
    const optMatches = template.optionalTags.filter((t) =>
      allTags.includes(t),
    ).length;
    const score = reqMatches * 2 + optMatches;
    if (score > maxScore) {
      maxScore = score;
      compType = type as CompositionType;
    }
  }

  // Build strengths and weaknesses
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  // Damage profile analysis
  if (damageProfile.ap >= 60) {
    weaknesses.push('Heavy AP - vulnerable to MR stacking');
  } else if (damageProfile.ad >= 60) {
    weaknesses.push('Heavy AD - vulnerable to armor stacking');
  } else {
    strengths.push('Balanced damage profile');
  }

  // Engage analysis
  if (engageLevel >= 70) {
    strengths.push('Strong engage tools');
  } else if (engageLevel <= 30) {
    weaknesses.push('Lacks reliable engage');
  }

  // Peel analysis
  if (peelLevel >= 70) {
    strengths.push('Excellent peel for carries');
  } else if (peelLevel <= 30) {
    weaknesses.push('Limited peel - carries vulnerable');
  }

  // Waveclear analysis
  if (waveclearLevel >= 70) {
    strengths.push('Good waveclear');
  } else if (waveclearLevel <= 40) {
    weaknesses.push('Weak waveclear - can be sieged');
  }

  // Power spike analysis
  if (powerSpikes.includes('early') && !powerSpikes.includes('late')) {
    strengths.push('Strong early game pressure');
    weaknesses.push('Falls off late game');
  } else if (powerSpikes.includes('late') && !powerSpikes.includes('early')) {
    strengths.push('Excellent scaling');
    weaknesses.push('Weak early game');
  }

  // Add composition-specific strengths/weaknesses
  const compTemplate = COMPOSITION_TEMPLATES[compType];
  strengths.push(...compTemplate.strengthKeywords.slice(0, 2));
  weaknesses.push(...compTemplate.weaknessKeywords.slice(0, 1));

  return {
    type: compType,
    strengths: [...new Set(strengths)].slice(0, 4),
    weaknesses: [...new Set(weaknesses)].slice(0, 3),
    powerSpikes,
    damageProfile,
    engageLevel,
    peelLevel,
    waveclearLevel,
  };
}

// Check what the team needs based on current picks
export function getTeamNeeds(picks: (Champion | null)[]): string[] {
  const validPicks = picks.filter(Boolean) as Champion[];
  const metas = validPicks
    .map((p) => CHAMPION_META[p.id.toLowerCase()])
    .filter(Boolean);

  const needs: string[] = [];

  const avgEngage =
    metas.reduce((sum, m) => sum + m.engageRating, 0) / (metas.length || 1);
  const avgPeel =
    metas.reduce((sum, m) => sum + m.peelRating, 0) / (metas.length || 1);

  let apCount = 0;
  let adCount = 0;
  validPicks.forEach((pick) => {
    const meta = CHAMPION_META[pick.id.toLowerCase()];
    if (meta) {
      if (meta.damageType === 'ap') apCount++;
      else if (meta.damageType === 'ad') adCount++;
    }
  });

  if (avgEngage < 5 && metas.length >= 2) {
    needs.push('engage');
  }
  if (avgPeel < 5 && metas.length >= 2) {
    needs.push('peel');
  }
  if (apCount === 0 && metas.length >= 2) {
    needs.push('ap-damage');
  }
  if (adCount === 0 && metas.length >= 2) {
    needs.push('ad-damage');
  }

  return needs;
}
