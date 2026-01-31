import { Injectable, Logger } from '@nestjs/common';
import { StatsFeedClient } from '../grid/clients/stats-feed.client';
import { CacheService } from '../cache/cache.service';

// Mock C9 player data - In production, this would come from GRID API
// Updated 2026 LCS roster
const C9_PLAYERS = [
  {
    id: 'c9-thanatos',
    name: 'Thanatos',
    realName: 'Park Seung-gyu',
    role: 'TOP',
    image: '/images/players/thanatos.webp',
    nationality: 'KR',
  },
  {
    id: 'c9-blaber',
    name: 'Blaber',
    realName: 'Robert Huang',
    role: 'JGL',
    image: '/images/players/blaber.webp',
    nationality: 'US',
  },
  {
    id: 'c9-apa',
    name: 'APA',
    realName: 'Eain Stearns',
    role: 'MID',
    image: '/images/players/apa.webp',
    nationality: 'US',
  },
  {
    id: 'c9-zven',
    name: 'Zven',
    realName: 'Jesper Svenningsen',
    role: 'ADC',
    image: '/images/players/zven.webp',
    nationality: 'DK',
  },
  {
    id: 'c9-vulcan',
    name: 'Vulcan',
    realName: 'Philippe Laflamme',
    role: 'SUP',
    image: '/images/players/vulcan.webp',
    nationality: 'CA',
  },
];

// Mock statistics data for demo purposes
// In production, this would be fetched from GRID Stats Feed API
const MOCK_PLAYER_STATS: Record<string, any> = {
  'c9-thanatos': {
    playerId: 'c9-thanatos',
    gamesPlayed: 45,
    wins: 28,
    losses: 17,
    winRate: 62.2,
    kda: 3.5,
    avgKills: 3.2,
    avgDeaths: 3.1,
    avgAssists: 7.6,
    csPerMin: 8.8,
    goldPerMin: 398,
    visionScore: 35.2,
    firstBloodRate: 17.8,
    championPool: [
      { champion: 'Rumble', games: 10, wins: 7, losses: 3, winRate: 70.0, kda: 3.8, pickRate: 22.2 },
      { champion: 'K\'Sante', games: 8, wins: 5, losses: 3, winRate: 62.5, kda: 3.5, pickRate: 17.8 },
      { champion: 'Renekton', games: 7, wins: 4, losses: 3, winRate: 57.1, kda: 3.2, pickRate: 15.6 },
      { champion: 'Jayce', games: 6, wins: 4, losses: 2, winRate: 66.7, kda: 3.6, pickRate: 13.3 },
      { champion: 'Gnar', games: 5, wins: 3, losses: 2, winRate: 60.0, kda: 3.9, pickRate: 11.1 },
      { champion: 'Aatrox', games: 5, wins: 3, losses: 2, winRate: 60.0, kda: 3.4, pickRate: 11.1 },
      { champion: 'Ornn', games: 4, wins: 2, losses: 2, winRate: 50.0, kda: 2.8, pickRate: 8.9 },
    ],
  },
  'c9-blaber': {
    playerId: 'c9-blaber',
    gamesPlayed: 45,
    wins: 28,
    losses: 17,
    winRate: 62.2,
    kda: 4.8,
    avgKills: 4.2,
    avgDeaths: 2.8,
    avgAssists: 9.3,
    csPerMin: 6.2,
    goldPerMin: 412,
    visionScore: 42.5,
    firstBloodRate: 35.6,
    championPool: [
      { champion: 'Lee Sin', games: 12, wins: 8, losses: 4, winRate: 66.7, kda: 5.2, pickRate: 26.7 },
      { champion: 'Nidalee', games: 8, wins: 6, losses: 2, winRate: 75.0, kda: 5.8, pickRate: 17.8 },
      { champion: 'Viego', games: 7, wins: 4, losses: 3, winRate: 57.1, kda: 4.5, pickRate: 15.6 },
      { champion: 'Rek\'Sai', games: 6, wins: 4, losses: 2, winRate: 66.7, kda: 4.1, pickRate: 13.3 },
      { champion: 'Elise', games: 5, wins: 3, losses: 2, winRate: 60.0, kda: 4.9, pickRate: 11.1 },
      { champion: 'Jarvan IV', games: 4, wins: 2, losses: 2, winRate: 50.0, kda: 3.8, pickRate: 8.9 },
      { champion: 'Kindred', games: 3, wins: 1, losses: 2, winRate: 33.3, kda: 3.2, pickRate: 6.7 },
    ],
  },
  'c9-apa': {
    playerId: 'c9-apa',
    gamesPlayed: 45,
    wins: 28,
    losses: 17,
    winRate: 62.2,
    kda: 4.2,
    avgKills: 5.1,
    avgDeaths: 2.9,
    avgAssists: 7.1,
    csPerMin: 9.4,
    goldPerMin: 445,
    visionScore: 28.3,
    firstBloodRate: 22.2,
    championPool: [
      { champion: 'Ahri', games: 10, wins: 7, losses: 3, winRate: 70.0, kda: 4.8, pickRate: 22.2 },
      { champion: 'Azir', games: 8, wins: 5, losses: 3, winRate: 62.5, kda: 4.1, pickRate: 17.8 },
      { champion: 'Syndra', games: 7, wins: 4, losses: 3, winRate: 57.1, kda: 3.9, pickRate: 15.6 },
      { champion: 'Orianna', games: 6, wins: 4, losses: 2, winRate: 66.7, kda: 4.5, pickRate: 13.3 },
      { champion: 'Akali', games: 5, wins: 3, losses: 2, winRate: 60.0, kda: 4.2, pickRate: 11.1 },
      { champion: 'LeBlanc', games: 5, wins: 3, losses: 2, winRate: 60.0, kda: 4.0, pickRate: 11.1 },
      { champion: 'Zed', games: 4, wins: 2, losses: 2, winRate: 50.0, kda: 3.5, pickRate: 8.9 },
    ],
  },
  'c9-zven': {
    playerId: 'c9-zven',
    gamesPlayed: 45,
    wins: 28,
    losses: 17,
    winRate: 62.2,
    kda: 6.8,
    avgKills: 6.8,
    avgDeaths: 2.1,
    avgAssists: 7.5,
    csPerMin: 10.2,
    goldPerMin: 485,
    visionScore: 22.1,
    firstBloodRate: 15.6,
    championPool: [
      { champion: 'Jinx', games: 11, wins: 8, losses: 3, winRate: 72.7, kda: 7.8, pickRate: 24.4 },
      { champion: 'Kai\'Sa', games: 9, wins: 6, losses: 3, winRate: 66.7, kda: 6.5, pickRate: 20.0 },
      { champion: 'Aphelios', games: 8, wins: 5, losses: 3, winRate: 62.5, kda: 6.2, pickRate: 17.8 },
      { champion: 'Zeri', games: 6, wins: 4, losses: 2, winRate: 66.7, kda: 7.1, pickRate: 13.3 },
      { champion: 'Ezreal', games: 5, wins: 3, losses: 2, winRate: 60.0, kda: 5.8, pickRate: 11.1 },
      { champion: 'Lucian', games: 4, wins: 2, losses: 2, winRate: 50.0, kda: 5.2, pickRate: 8.9 },
      { champion: 'Varus', games: 2, wins: 0, losses: 2, winRate: 0.0, kda: 3.1, pickRate: 4.4 },
    ],
  },
  'c9-vulcan': {
    playerId: 'c9-vulcan',
    gamesPlayed: 45,
    wins: 28,
    losses: 17,
    winRate: 62.2,
    kda: 3.8,
    avgKills: 1.2,
    avgDeaths: 3.5,
    avgAssists: 12.1,
    csPerMin: 1.8,
    goldPerMin: 285,
    visionScore: 78.5,
    firstBloodRate: 8.9,
    championPool: [
      { champion: 'Nautilus', games: 10, wins: 7, losses: 3, winRate: 70.0, kda: 4.2, pickRate: 22.2 },
      { champion: 'Thresh', games: 8, wins: 5, losses: 3, winRate: 62.5, kda: 3.8, pickRate: 17.8 },
      { champion: 'Rakan', games: 7, wins: 5, losses: 2, winRate: 71.4, kda: 4.5, pickRate: 15.6 },
      { champion: 'Alistar', games: 6, wins: 4, losses: 2, winRate: 66.7, kda: 3.5, pickRate: 13.3 },
      { champion: 'Renata Glasc', games: 5, wins: 3, losses: 2, winRate: 60.0, kda: 3.9, pickRate: 11.1 },
      { champion: 'Leona', games: 5, wins: 2, losses: 3, winRate: 40.0, kda: 3.1, pickRate: 11.1 },
      { champion: 'Braum', games: 4, wins: 2, losses: 2, winRate: 50.0, kda: 3.2, pickRate: 8.9 },
    ],
  },
};

@Injectable()
export class PlayersService {
  private readonly logger = new Logger(PlayersService.name);

  constructor(
    private statsFeedClient: StatsFeedClient,
    private cacheService: CacheService,
  ) {}

  async getC9Players() {
    // Return C9 roster with basic info
    return {
      team: {
        id: 'c9',
        name: 'Cloud9',
        region: 'LCS',
        logo: '/images/teams/c9-logo.svg',
      },
      players: C9_PLAYERS,
    };
  }

  async getPlayerStats(playerId: string, period: string) {
    // Check cache first
    const cacheKey = `player:stats:${playerId}:${period}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for ${cacheKey}`);
      return cached;
    }

    // For demo, return mock data
    // In production, use: await this.statsFeedClient.getPlayerStatistics(playerId, period);
    const stats = MOCK_PLAYER_STATS[playerId];
    if (!stats) {
      return { error: 'Player not found', playerId };
    }

    // Get player info
    const player = C9_PLAYERS.find((p) => p.id === playerId);

    const result = {
      player,
      stats,
      period,
      lastUpdated: new Date().toISOString(),
    };

    // Cache for 1 hour
    await this.cacheService.set(cacheKey, result, 3600);

    return result;
  }

  async getPlayerChampionPool(playerId: string, period: string) {
    const stats = MOCK_PLAYER_STATS[playerId];
    if (!stats) {
      return { error: 'Player not found', playerId };
    }

    const player = C9_PLAYERS.find((p) => p.id === playerId);

    return {
      player,
      championPool: stats.championPool,
      totalGames: stats.gamesPlayed,
      period,
    };
  }
}
