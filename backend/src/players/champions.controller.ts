import { Controller, Get } from '@nestjs/common';
import { PlayersService } from './players.service';

@Controller('champions')
export class ChampionsController {
  constructor(private readonly playersService: PlayersService) {}

  @Get()
  async getChampions() {
    return this.playersService.getChampions();
  }
}
