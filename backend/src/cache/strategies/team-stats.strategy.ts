import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from '../cache.service';
import { StatsFeedClient } from '../../grid/clients/stats-feed.client';

@Injectable()
export class TeamStatsStrategy {
  private readonly logger = new Logger(TeamStatsStrategy.name);

  constructor(
    private cacheService: CacheService,
    private statsFeedClient: StatsFeedClient,
  ) {}

  private getCacheKey(teamId: string, timePeriod: string): string {
    return `team:stats:${teamId}:${timePeriod}`;
  }

  private getTTL(timePeriod: string): number {
    switch (timePeriod) {
      case 'LAST_WEEK':
        return 3600; // 1 hour
      case 'LAST_MONTH':
        return 3600; // 1 hour
      case 'LAST_3_MONTHS':
        return 21600; // 6 hours
      case 'LAST_6_MONTHS':
        return 43200; // 12 hours
      case 'LAST_YEAR':
        return 86400; // 24 hours
      default:
        return 3600;
    }
  }

  async get(teamId: string, timePeriod: string): Promise<any> {
    const cacheKey = this.getCacheKey(teamId, timePeriod);

    // Check cache first
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for ${cacheKey}`);
      return cached;
    }

    this.logger.debug(`Cache miss for ${cacheKey}, fetching from API`);

    try {
      // Fetch from GRID API
      const stats = await this.statsFeedClient.getTeamStatistics(
        teamId,
        timePeriod
      );

      // Cache the result
      const ttl = this.getTTL(timePeriod);
      await this.cacheService.set(cacheKey, stats, ttl);

      return stats;
    } catch (error) {
      this.logger.error(`Failed to fetch team stats for ${teamId}`, error);
      throw error;
    }
  }

  async invalidate(teamId: string): Promise<void> {
    const pattern = `team:stats:${teamId}:*`;
    await this.cacheService.deletePattern(pattern);
    this.logger.log(`Invalidated team stats cache for ${teamId}`);
  }
}
