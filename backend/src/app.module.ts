import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from './config/config.module';
import { GridModule } from './grid/grid.module';
import { CacheModule } from './cache/cache.module';
import { PlayersModule } from './players/players.module';
import { ScoutingModule } from './scouting/scouting.module';
import { DraftModule } from './draft/draft.module';
import { SampleMatchesModule } from './sample-matches/sample-matches.module';

@Module({
  imports: [
    ConfigModule,
    GridModule,
    CacheModule,
    PlayersModule,
    ScoutingModule,
    DraftModule,
    SampleMatchesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
