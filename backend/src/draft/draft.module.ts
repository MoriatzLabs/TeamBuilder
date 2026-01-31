import { Module } from '@nestjs/common';
import { DraftGateway } from './draft.gateway';
import { DraftService } from './draft.service';
import { AnalyticsService } from './analytics.service';

@Module({
  providers: [DraftGateway, DraftService, AnalyticsService],
  exports: [DraftService, AnalyticsService],
})
export class DraftModule {}
