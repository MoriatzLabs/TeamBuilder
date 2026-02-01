/**
 * GRID API Client for frontend
 * Connects to the backend GRID endpoints to fetch esports data
 */

const API_BASE = '/api/grid';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface Tournament {
  id: string;
  name: string;
  slug: string;
}

interface Team {
  id: string;
  name: string;
  slug: string;
}

interface Player {
  id: string;
  name: string;
  slug: string;
}

interface ChampionPoolEntry {
  championId: string;
  championName: string;
  games: number;
  wins: number;
  losses: number;
  winRate: number;
  kda?: number;
  csDiff?: number;
  pickRate?: number;
  banRate?: number;
}

interface PlayerStats {
  playerId: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  championPool: ChampionPoolEntry[];
}

interface TeamStats {
  teamId: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  averageGameTime: number;
  championPool: ChampionPoolEntry[];
}

export class GridApiClient {
  private async fetch<T>(endpoint: string): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${API_BASE}${endpoint}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`GRID API error for ${endpoint}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    const response = await this.fetch<{ status: string; timestamp: string }>('/health');
    return response.data || { status: 'unknown', timestamp: new Date().toISOString() };
  }

  async getTournaments(): Promise<Tournament[]> {
    const response = await this.fetch<{ tournaments: { edges: { node: Tournament }[] } }>('/tournaments');
    if (response.success && response.data?.tournaments?.edges) {
      return response.data.tournaments.edges.map(edge => edge.node);
    }
    return [];
  }

  async getTeams(tournamentId: string): Promise<Team[]> {
    const response = await this.fetch<{ teams: { edges: { node: Team }[] } }>(`/teams/${tournamentId}`);
    if (response.success && response.data?.teams?.edges) {
      return response.data.teams.edges.map(edge => edge.node);
    }
    return [];
  }

  async getPlayers(teamId: string): Promise<Player[]> {
    const response = await this.fetch<{ players: { edges: { node: Player }[] } }>(`/players/${teamId}`);
    if (response.success && response.data?.players?.edges) {
      return response.data.players.edges.map(edge => edge.node);
    }
    return [];
  }

  async getPlayerStats(playerId: string, period: string = 'LAST_3_MONTHS'): Promise<PlayerStats | null> {
    const response = await this.fetch<{ playerStatistics: PlayerStats }>(`/player-stats/${playerId}?period=${period}`);
    if (response.success && response.data?.playerStatistics) {
      return response.data.playerStatistics;
    }
    return null;
  }

  async getTeamStats(teamId: string, period: string = 'LAST_3_MONTHS'): Promise<TeamStats | null> {
    const response = await this.fetch<{ teamStatistics: TeamStats }>(`/team-stats/${teamId}?period=${period}`);
    if (response.success && response.data?.teamStatistics) {
      return response.data.teamStatistics;
    }
    return null;
  }

  async getChampions(): Promise<{ id: string; name: string }[]> {
    const response = await this.fetch<{ champions: { edges: { node: { id: string; name: string } }[] } }>('/champions');
    if (response.success && response.data?.champions?.edges) {
      return response.data.champions.edges.map(edge => edge.node);
    }
    return [];
  }
}

// Singleton instance
export const gridApi = new GridApiClient();

// React Query hooks for GRID API
export const gridApiKeys = {
  health: ['grid', 'health'] as const,
  tournaments: ['grid', 'tournaments'] as const,
  teams: (tournamentId: string) => ['grid', 'teams', tournamentId] as const,
  players: (teamId: string) => ['grid', 'players', teamId] as const,
  playerStats: (playerId: string, period: string) => ['grid', 'playerStats', playerId, period] as const,
  teamStats: (teamId: string, period: string) => ['grid', 'teamStats', teamId, period] as const,
  champions: ['grid', 'champions'] as const,
};
