import { Injectable, Logger } from '@nestjs/common';
import { TeamStatsStrategy } from '../cache/strategies/team-stats.strategy';
import { MetaStatsStrategy } from '../cache/strategies/meta-stats.strategy';

@Injectable()
export class ScoutingService {
  private readonly logger = new Logger(ScoutingService.name);

  constructor(
    private teamStatsStrategy: TeamStatsStrategy,
    private metaStatsStrategy: MetaStatsStrategy,
  ) {}

  async getTeamStats(teamId: string, timePeriod: string) {
    return this.teamStatsStrategy.get(teamId, timePeriod);
  }

  async getMetaStats(tournamentId: string, patch: string) {
    return this.metaStatsStrategy.get(tournamentId, patch);
  }

  async invalidateTeamStats(teamId: string) {
    await this.teamStatsStrategy.invalidate(teamId);
  }

  async invalidateMetaStats(tournamentId: string) {
    await this.metaStatsStrategy.invalidate(tournamentId);
  }
}
