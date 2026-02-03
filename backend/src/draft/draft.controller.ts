import { Controller, Post, Body, Logger } from '@nestjs/common';
import { OpenAIService } from './openai.service';
import type { DraftStateForAI } from './openai.service';

/**
 * Draft recommendations API.
 * Send full draft state as JSON in the request body; recommendations reflect current picks/bans.
 * As more players pick/ban, send the updated state to get new recommendations.
 */
@Controller('draft')
export class DraftController {
  private readonly logger = new Logger(DraftController.name);

  constructor(private readonly openaiService: OpenAIService) {}

  @Post('recommendations')
  async getRecommendations(@Body() draftState: DraftStateForAI) {
    if (!draftState?.blueTeam || !draftState?.redTeam) {
      return {
        success: false,
        error: 'Request body must be JSON with draftState (phase, currentTeam, pickNumber, blueTeam, redTeam, availableChampions)',
      };
    }
    this.logger.log(
      `Recommendations for ${draftState.currentTeam} team, phase: ${draftState.phase}, pick #${draftState.pickNumber}`,
    );

    const result = await this.openaiService.getRecommendations(draftState);

    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('game-plan')
  async getGamePlan(
    @Body()
    payload: {
      draftState: DraftStateForAI;
      c9Team: 'blue' | 'red';
    },
  ) {
    if (!payload?.draftState?.blueTeam || !payload?.draftState?.redTeam) {
      return {
        success: false,
        error: 'Request body must be JSON with draftState and c9Team (blue or red)',
      };
    }
    if (!payload.c9Team || !['blue', 'red'].includes(payload.c9Team)) {
      return {
        success: false,
        error: 'c9Team must be "blue" or "red"',
      };
    }

    this.logger.log(`Generating game plan for C9 (${payload.c9Team} team)`);

    const result = await this.openaiService.generateGamePlan(
      payload.draftState,
      payload.c9Team,
    );

    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }
}
