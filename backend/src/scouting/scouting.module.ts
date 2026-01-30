import { Module } from '@nestjs/common';
import { GridModule } from '../grid/grid.module';
import { CacheModule } from '../cache/cache.module';
import { TeamStatsStrategy } from '../cache/strategies/team-stats.strategy';
import { MetaStatsStrategy } from '../cache/strategies/meta-stats.strategy';
import { ScoutingService } from './scouting.service';

@Module({
  imports: [GridModule, CacheModule],
  providers: [TeamStatsStrategy, MetaStatsStrategy, ScoutingService],
  exports: [TeamStatsStrategy, MetaStatsStrategy, ScoutingService],
})
export class ScoutingModule {}
