import { Controller, Get, Param, Query } from '@nestjs/common';
import { PlayersService } from './players.service';

@Controller('api/players')
export class PlayersController {
  constructor(private readonly playersService: PlayersService) {}

  @Get('c9')
  async getC9Players() {
    return this.playersService.getC9Players();
  }

  @Get(':playerId/stats')
  async getPlayerStats(
    @Param('playerId') playerId: string,
    @Query('period') period: string = 'LAST_3_MONTHS',
  ) {
    return this.playersService.getPlayerStats(playerId, period);
  }

  @Get(':playerId/champion-pool')
  async getPlayerChampionPool(
    @Param('playerId') playerId: string,
    @Query('period') period: string = 'LAST_3_MONTHS',
  ) {
    return this.playersService.getPlayerChampionPool(playerId, period);
  }
}
