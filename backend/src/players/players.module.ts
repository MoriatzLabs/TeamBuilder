import { Module } from '@nestjs/common';
import { PlayersController } from './players.controller';
import { PlayersService } from './players.service';
import { GridModule } from '../grid/grid.module';
import { CacheModule } from '../cache/cache.module';

@Module({
  imports: [GridModule, CacheModule],
  controllers: [PlayersController],
  providers: [PlayersService],
  exports: [PlayersService],
})
export class PlayersModule {}
