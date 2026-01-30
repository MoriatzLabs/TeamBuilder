import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from '../cache.service';
import { StatsFeedClient } from '../../grid/clients/stats-feed.client';

@Injectable()
export class MetaStatsStrategy {
  private readonly logger = new Logger(MetaStatsStrategy.name);

  constructor(
    private cacheService: CacheService,
    private statsFeedClient: StatsFeedClient,
  ) {}

  private getCacheKey(tournamentId: string, patch: string): string {
    return `meta:stats:${tournamentId}:${patch}`;
  }

  private getTTL(): number {
    return 86400; // 24 hours for meta stats
  }

  async get(tournamentId: string, patch: string): Promise<any> {
    const cacheKey = this.getCacheKey(tournamentId, patch);

    // Check cache first
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for ${cacheKey}`);
      return cached;
    }

    this.logger.debug(`Cache miss for ${cacheKey}, fetching from API`);

    try {
      // Fetch meta stats from GRID API
      // This would be a specific query for tournament-wide stats
      // Placeholder implementation - actual query depends on GRID API structure
      const metaStats = {
        tournamentId,
        patch,
        championStats: [],
        trendingPicks: [],
        updatedAt: new Date().toISOString(),
      };

      // Cache the result
      const ttl = this.getTTL();
      await this.cacheService.set(cacheKey, metaStats, ttl);

      return metaStats;
    } catch (error) {
      this.logger.error(
        `Failed to fetch meta stats for ${tournamentId}`,
        error
      );
      throw error;
    }
  }

  async invalidate(tournamentId: string): Promise<void> {
    const pattern = `meta:stats:${tournamentId}:*`;
    await this.cacheService.deletePattern(pattern);
    this.logger.log(`Invalidated meta stats cache for ${tournamentId}`);
  }

  async invalidateAll(): Promise<void> {
    await this.cacheService.deletePattern('meta:stats:*');
    this.logger.log('Invalidated all meta stats cache');
  }
}
