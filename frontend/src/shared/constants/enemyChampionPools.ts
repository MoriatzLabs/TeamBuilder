interface ChampionPoolEntry {
  champion: string;
  games: number;
  wins: number;
  losses: number;
  winRate: number;
  kda: number;
  pickRate: number;
}

function createChampionPool(champions: string[]): ChampionPoolEntry[] {
  return champions.map((champ, index) => {
    const baseGames = 15 - index * 2;
    const baseWins = Math.floor(baseGames * 0.6);
    const baseLosses = baseGames - baseWins;
    return {
      champion: champ.trim(),
      games: baseGames,
      wins: baseWins,
      losses: baseLosses,
      winRate: (baseWins / baseGames) * 100,
      kda: 2.5 + (index * 0.2),
      pickRate: (baseGames / 50) * 100,
    };
  });
}

export const ENEMY_CHAMPION_POOLS: Record<string, ChampionPoolEntry[]> = {
  "dig-top": createChampionPool(["K'Sante", "Renekton", "Aatrox", "Gnar", "Ornn", "Jax", "Rumble"]),
  "dig-jgl": createChampionPool(["Wukong", "Lee Sin", "Jarvan IV", "Vi", "Viego", "Sejuani", "Xin Zhao"]),
  "dig-mid": createChampionPool(["Orianna", "Syndra", "Azir", "Taliyah", "Viktor", "Akali"]),
  "dig-adc": createChampionPool(["Kai'Sa", "Smolder", "Senna", "Aphelios", "Jinx", "Zeri"]),
  "dig-sup": createChampionPool(["Alistar", "Nautilus", "Rell", "Rakan", "Leona", "Thresh"]),
  
  "dsg-top": createChampionPool(["K'Sante", "Renekton", "Gnar", "Ornn", "Aatrox"]),
  "dsg-jgl": createChampionPool(["Lee Sin", "Viego", "Jarvan IV", "Vi", "Wukong"]),
  "dsg-mid": createChampionPool(["Orianna", "Azir", "Viktor", "Taliyah", "Syndra"]),
  "dsg-adc": createChampionPool(["Kai'Sa", "Jinx", "Aphelios", "Zeri", "Xayah"]),
  "dsg-sup": createChampionPool(["Nautilus", "Rell", "Alistar", "Rakan", "Leona"]),
  
  "fly-top": createChampionPool(["K'Sante", "Rumble", "Gnar", "Renekton", "Ornn"]),
  "fly-jgl": createChampionPool(["Lee Sin", "Viego", "Xin Zhao", "Vi", "Jarvan IV"]),
  "fly-mid": createChampionPool(["Sylas", "Azir", "Orianna", "Akali", "Taliyah"]),
  "fly-adc": createChampionPool(["Zeri", "Kai'Sa", "Jinx", "Aphelios", "Xayah"]),
  "fly-sup": createChampionPool(["Rell", "Nautilus", "Rakan", "Alistar", "Leona"]),
  
  "lyon-top": createChampionPool(["Rumble", "K'Sante", "Jax", "Renekton", "Gnar"]),
  "lyon-jgl": createChampionPool(["Jarvan IV", "Vi", "Wukong", "Lee Sin", "Sejuani", "Xin Zhao"]),
  "lyon-mid": createChampionPool(["Akali", "Taliyah", "Azir", "Orianna", "Sylas"]),
  "lyon-adc": createChampionPool(["Aphelios", "Zeri", "Jinx", "Kai'Sa", "Xayah"]),
  "lyon-sup": createChampionPool(["Bard", "Rakan", "Nautilus", "Alistar", "Thresh"]),
  
  "sen-top": createChampionPool(["Gnar", "Ornn", "Renekton", "K'Sante", "Aatrox"]),
  "sen-jgl": createChampionPool(["Sejuani", "Viego", "Vi", "Jarvan IV", "Wukong"]),
  "sen-mid": createChampionPool(["Azir", "Orianna", "Akali", "Viktor", "Sylas"]),
  "sen-adc": createChampionPool(["Aphelios", "Jinx", "Kai'Sa", "Zeri", "Xayah"]),
  "sen-sup": createChampionPool(["Rakan", "Alistar", "Nautilus", "Leona", "Thresh"]),
  
  "sr-top": createChampionPool(["K'Sante", "Jax", "Renekton", "Aatrox", "Gnar"]),
  "sr-jgl": createChampionPool(["Lee Sin", "Vi", "Viego", "Jarvan IV", "Wukong"]),
  "sr-mid": createChampionPool(["Orianna", "Syndra", "Azir", "Viktor", "Taliyah"]),
  "sr-adc": createChampionPool(["Kai'Sa", "Xayah", "Aphelios", "Zeri", "Jinx"]),
  "sr-sup": createChampionPool(["Rell", "Nautilus", "Rakan", "Alistar", "Leona"]),
  
  "tl-top": createChampionPool(["Aatrox", "Renekton", "Gnar", "K'Sante", "Jax"]),
  "tl-jgl": createChampionPool(["Lee Sin", "Vi", "Wukong", "Jarvan IV", "Viego"]),
  "tl-mid": createChampionPool(["Azir", "Taliyah", "Orianna", "Sylas", "Viktor"]),
  "tl-adc": createChampionPool(["Zeri", "Aphelios", "Jinx", "Kai'Sa", "Xayah"]),
  "tl-sup": createChampionPool(["Nautilus", "Rakan", "Thresh", "Alistar", "Braum"]),
};
