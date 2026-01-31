import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from './config/config.module';
import { GridModule } from './grid/grid.module';
import { CacheModule } from './cache/cache.module';
import { PlayersModule } from './players/players.module';
import { ScoutingModule } from './scouting/scouting.module';
import { DraftModule } from './draft/draft.module';

@Module({
  imports: [
    ConfigModule,
    GridModule,
    CacheModule,
    PlayersModule,
    ScoutingModule,
    DraftModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
