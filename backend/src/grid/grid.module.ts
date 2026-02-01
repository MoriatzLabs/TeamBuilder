import { Module } from '@nestjs/common';
import { CentralDataClient } from './clients/central-data.client';
import { StatsFeedClient } from './clients/stats-feed.client';
import { SeriesStateClient } from './clients/series-state.client';
import { SeriesEventsClient } from './clients/series-events.client';
import { GridService } from './grid.service';
import { GridController } from './grid.controller';

@Module({
  controllers: [GridController],
  providers: [
    CentralDataClient,
    StatsFeedClient,
    SeriesStateClient,
    SeriesEventsClient,
    GridService,
  ],
  exports: [
    CentralDataClient,
    StatsFeedClient,
    SeriesStateClient,
    SeriesEventsClient,
    GridService,
  ],
})
export class GridModule {}
