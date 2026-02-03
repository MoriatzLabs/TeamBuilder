/**
 * Maps champion display names to Data Dragon image filenames
 * Handles special casing and naming conventions
 */

// Data Dragon CDN version - update as needed
const DDRAGON_VERSION = "16.2.1";
const DDRAGON_BASE_URL = `https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VERSION}/img/champion`;

// Special cases where the display name differs from the Data Dragon filename
// Keys should be lowercase for case-insensitive matching
const SPECIAL_CASES: Record<string, string> = {
  "nunu & willump": "Nunu",
  nunu: "Nunu",
  "kai'sa": "Kaisa",
  kaisa: "Kaisa",
  "rek'sai": "RekSai",
  reksai: "RekSai",
  leblanc: "Leblanc",
  "renata glasc": "Renata",
  renata: "Renata",
  "k'sante": "KSante",
  ksante: "KSante",
  "jarvan iv": "JarvanIV",
  jarvaniv: "JarvanIV",
  j4: "JarvanIV",
  wukong: "MonkeyKing",
  "lee sin": "LeeSin",
  leesin: "LeeSin",
  "xin zhao": "XinZhao",
  xinzhao: "XinZhao",
  "dr. mundo": "DrMundo",
  drmundo: "DrMundo",
  "tahm kench": "TahmKench",
  tahmkench: "TahmKench",
  "aurelion sol": "AurelionSol",
  aurelionsol: "AurelionSol",
  "master yi": "MasterYi",
  masteryi: "MasterYi",
  "miss fortune": "MissFortune",
  missfortune: "MissFortune",
  "twisted fate": "TwistedFate",
  twistedfate: "TwistedFate",
  "cho'gath": "Chogath",
  chogath: "Chogath",
  "vel'koz": "Velkoz",
  velkoz: "Velkoz",
  "kha'zix": "Khazix",
  khazix: "Khazix",
  "kog'maw": "KogMaw",
  kogmaw: "KogMaw",
  "bel'veth": "Belveth",
  belveth: "Belveth",
  yunara: "Yunara",
};

/**
 * Get the Data Dragon image filename for a champion
 * @param displayName - The champion name as displayed in the UI (e.g., "Lee Sin", "Kai'Sa")
 * @returns The filename without extension (e.g., "LeeSin", "Kaisa")
 */
export function getChampionImageName(displayName: string): string {
  if (!displayName) return "Unknown";

  // Check special cases first (case-insensitive)
  const lowerName = displayName.toLowerCase();
  if (lowerName in SPECIAL_CASES) {
    return SPECIAL_CASES[lowerName];
  }

  // Remove spaces, apostrophes, and periods
  const cleaned = displayName.replace(/['\s.]/g, "");

  // Ensure first letter is capitalized (Data Dragon format)
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

/**
 * Get the full URL for a champion icon from Data Dragon CDN
 * @param championName - The champion name as displayed in the UI
 * @returns The URL to the champion icon on Data Dragon CDN
 */
export function getChampionImageUrl(championName: string): string {
  const imageName = getChampionImageName(championName);
  return `${DDRAGON_BASE_URL}/${imageName}.png`;
}

/**
 * Get the local image URL for a champion (fallback)
 * @param championName - The champion name as displayed in the UI
 * @returns The relative URL to the local champion icon
 */
export function getLocalChampionImageUrl(championName: string): string {
  const imageName = getChampionImageName(championName);
  return `/images/champions/${imageName}.png`;
}

/**
 * Get fallback text for when a champion image fails to load
 * @param championName - The champion name
 * @returns The initials of the champion name
 */
export function getChampionInitials(championName: string): string {
  if (!championName) return "?";
  return championName
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}
