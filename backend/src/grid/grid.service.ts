import { Injectable, Logger } from '@nestjs/common';
import { CentralDataClient } from './clients/central-data.client';
import { StatsFeedClient } from './clients/stats-feed.client';
import { SeriesStateClient } from './clients/series-state.client';
import { SeriesEventsClient } from './clients/series-events.client';

@Injectable()
export class GridService {
  private readonly logger = new Logger(GridService.name);

  constructor(
    private centralDataClient: CentralDataClient,
    private statsFeedClient: StatsFeedClient,
    private seriesStateClient: SeriesStateClient,
    private seriesEventsClient: SeriesEventsClient,
  ) {}

  getCentralDataClient(): CentralDataClient {
    return this.centralDataClient;
  }

  getStatsFeedClient(): StatsFeedClient {
    return this.statsFeedClient;
  }

  getSeriesStateClient(): SeriesStateClient {
    return this.seriesStateClient;
  }

  getSeriesEventsClient(): SeriesEventsClient {
    return this.seriesEventsClient;
  }

  async healthCheck(): Promise<boolean> {
    try {
      // Try a simple query to verify API connectivity
      await this.centralDataClient.getTournaments();
      this.logger.log('GRID API health check passed');
      return true;
    } catch (error) {
      this.logger.error('GRID API health check failed:', error);
      return false;
    }
  }
}
