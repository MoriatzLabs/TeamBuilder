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
}
