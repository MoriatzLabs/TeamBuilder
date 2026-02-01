import { Controller, Get, Param, Query, Logger } from '@nestjs/common';
import { GridService } from './grid.service';
import { StatsFeedClient } from './clients/stats-feed.client';
import { CentralDataClient } from './clients/central-data.client';

@Controller('grid')
export class GridController {
  private readonly logger = new Logger(GridController.name);

  constructor(
    private readonly gridService: GridService,
    private readonly statsFeedClient: StatsFeedClient,
    private readonly centralDataClient: CentralDataClient,
  ) {}

  @Get('health')
  async healthCheck() {
    const isHealthy = await this.gridService.healthCheck();
    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('tournaments')
  async getTournaments() {
    try {
      const result = await this.centralDataClient.getTournaments();
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      this.logger.error('Failed to fetch tournaments:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Get('teams/:tournamentId')
  async getTeams(@Param('tournamentId') tournamentId: string) {
    try {
      const result = await this.centralDataClient.getTeams(tournamentId);
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      this.logger.error(`Failed to fetch teams for tournament ${tournamentId}:`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Get('players/:teamId')
  async getPlayers(@Param('teamId') teamId: string) {
    try {
      const result = await this.centralDataClient.getPlayers(teamId);
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      this.logger.error(`Failed to fetch players for team ${teamId}:`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Get('player-stats/:playerId')
  async getPlayerStats(
    @Param('playerId') playerId: string,
    @Query('period') period: string = 'LAST_3_MONTHS',
  ) {
    try {
      const result = await this.statsFeedClient.getPlayerStatistics(playerId, period);
      return {
        success: true,
        data: result,
        period,
      };
    } catch (error) {
      this.logger.error(`Failed to fetch stats for player ${playerId}:`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Get('team-stats/:teamId')
  async getTeamStats(
    @Param('teamId') teamId: string,
    @Query('period') period: string = 'LAST_3_MONTHS',
  ) {
    try {
      const result = await this.statsFeedClient.getTeamStatistics(teamId, period);
      return {
        success: true,
        data: result,
        period,
      };
    } catch (error) {
      this.logger.error(`Failed to fetch stats for team ${teamId}:`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Get('champions')
  async getChampions() {
    try {
      const result = await this.centralDataClient.getChampions();
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      this.logger.error('Failed to fetch champions:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
