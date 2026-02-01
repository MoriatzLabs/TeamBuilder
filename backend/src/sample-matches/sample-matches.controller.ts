import { Controller, Get, Query } from '@nestjs/common';
import { SampleMatchesService, SampleMatchStatsRow } from './sample-matches.service';

@Controller('sample-matches')
export class SampleMatchesController {
  constructor(private readonly sampleMatchesService: SampleMatchesService) {}

  @Get()
  health(): { ok: boolean; message: string } {
    return { ok: true, message: 'sample-matches' };
  }

  @Get('teams')
  getTeams(): { teams: string[] } {
    const teams = this.sampleMatchesService.getTeams();
    return { teams };
  }

  @Get('players')
  getPlayers(@Query('team') team: string): { players: string[] } {
    const players = this.sampleMatchesService.getPlayers(team ?? '');
    return { players };
  }

  @Get('champions')
  getChampions(
    @Query('team') team: string,
    @Query('player') player: string,
  ): { champions: string[] } {
    const champions = this.sampleMatchesService.getChampions(team ?? '', player ?? '');
    return { champions };
  }

  @Get('stats')
  getStats(
    @Query('team') team: string,
    @Query('player') player: string,
    @Query('champion') champion: string,
  ): { stats: SampleMatchStatsRow[] } {
    const stats = this.sampleMatchesService.getStats(
      team ?? '',
      player ?? '',
      champion ?? '',
    );
    return { stats };
  }
}
