/**
 * Maps champion display names to Data Dragon image filenames
 * Handles special casing and naming conventions
 */
const SPECIAL_CASES: Record<string, string> = {
  "Nunu & Willump": "Nunu",
  "Kai'Sa": "Kaisa",
  "Rek'Sai": "RekSai",
  "LeBlanc": "Leblanc",
  "Renata Glasc": "Renata",
  "K'Sante": "KSante",
  "Jarvan IV": "JarvanIV",
};

/**
 * Get the Data Dragon image filename for a champion
 * @param displayName - The champion name as displayed in the UI (e.g., "Lee Sin", "Kai'Sa")
 * @returns The filename without extension (e.g., "LeeSin", "Kaisa")
 */
export function getChampionImageName(displayName: string): string {
  // Check special cases first
  if (displayName in SPECIAL_CASES) {
    return SPECIAL_CASES[displayName];
  }

  // Remove spaces and apostrophes, keep original casing for most champions
  return displayName.replace(/['\s]/g, '');
}

/**
 * Get the full URL for a champion icon
 * @param championName - The champion name as displayed in the UI
 * @returns The relative URL to the champion icon
 */
export function getChampionImageUrl(championName: string): string {
  const imageName = getChampionImageName(championName);
  return `/images/champions/${imageName}.png`;
}

/**
 * Get fallback text for when a champion image fails to load
 * @param championName - The champion name
 * @returns The initials of the champion name
 */
export function getChampionInitials(championName: string): string {
  return championName
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase();
}
