// Champion data structure
export interface ChampionData {
  id: string;
  name: string;
  title?: string;
  roles: string[];
  tags: string[];
}

// This will be populated from GRID API
// Placeholder with common champions for demo purposes
export const CHAMPION_ROLES: Record<string, string[]> = {
  Aatrox: ["TOP"],
  Ahri: ["MID"],
  Akali: ["MID"],
  Azir: ["MID"],
  Blitzcrank: ["SUP"],
  Ekko: ["MID", "JGL"],
  Elise: ["JGL"],
  Gwen: ["TOP"],
  "Jarvan IV": ["JGL"],
  Jax: ["TOP"],
  Jinx: ["ADC"],
  Karthus: ["JGL", "MID"],
  Kayle: ["TOP"],
  Kennen: ["TOP", "MID"],
  "Kha'Zix": ["JGL"],
  Kindred: ["JGL"],
  "Lee Sin": ["JGL"],
  Leona: ["SUP"],
  Lissandra: ["MID"],
  Lulu: ["SUP", "MID"],
  Lux: ["MID", "SUP"],
  Malphite: ["TOP", "SUP"],
  Malzahar: ["MID"],
  Maokai: ["TOP", "SUP", "JGL"],
  Morde: ["TOP", "MID"],
  Nidalee: ["JGL"],
  Orianna: ["MID"],
  Rakan: ["SUP"],
  Ryze: ["MID"],
  Sion: ["TOP"],
  Syndra: ["MID"],
  Thresh: ["SUP"],
  "Ud'yr": ["JGL"],
  Urgot: ["TOP"],
  Yasuo: ["MID", "TOP"],
  Yone: ["MID", "TOP"],
  Zed: ["MID"],
};

export const CHAMPION_TAGS: Record<string, string[]> = {
  Aatrox: ["Melee", "Sustain"],
  Ahri: ["Ranged", "Mobility"],
  Azir: ["Ranged", "Control"],
  Blitzcrank: ["Melee", "CC"],
  "Lee Sin": ["Melee", "Engage", "Early Game"],
  Jinx: ["Ranged", "DPS"],
  Yasuo: ["Melee", "Mobility"],
  Thresh: ["Ranged", "CC", "Utility"],
};

export function getRolesForChampion(championName: string): string[] {
  return CHAMPION_ROLES[championName] || [];
}

export function getTagsForChampion(championName: string): string[] {
  return CHAMPION_TAGS[championName] || [];
}
