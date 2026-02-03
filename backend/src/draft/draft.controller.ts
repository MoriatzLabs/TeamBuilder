import { Controller, Post, Body, Logger } from '@nestjs/common';
import { CerebrasService } from './cerebras.service';
import type { DraftStateForAI, FinalDraftState } from './cerebras.service';

/**
 * Draft recommendations API.
 * Send full draft state as JSON in the request body; recommendations reflect current picks/bans.
 * As more players pick/ban, send the updated state to get new recommendations.
 */
@Controller('draft')
export class DraftController {
  private readonly logger = new Logger(DraftController.name);

  constructor(private readonly cerebrasService: CerebrasService) {}

  @Post('recommendations')
  async getRecommendations(@Body() draftState: DraftStateForAI) {
    if (!draftState?.blueTeam || !draftState?.redTeam) {
      return {
        success: false,
        error:
          'Request body must be JSON with draftState (phase, currentTeam, pickNumber, blueTeam, redTeam, availableChampions)',
      };
    }
    this.logger.log(
      `Recommendations for ${draftState.currentTeam} team, phase: ${draftState.phase}, pick #${draftState.pickNumber}`,
    );

    const result = await this.cerebrasService.getRecommendations(draftState);

    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('strategy')
  async getStrategy(@Body() finalDraft: FinalDraftState) {
    if (!finalDraft?.blueTeam || !finalDraft?.redTeam) {
      return {
        success: false,
        error:
          'Request body must be JSON with finalDraft (blueTeam, redTeam with their picks and bans)',
      };
    }

    if (
      finalDraft.blueTeam.picks.length !== 5 ||
      finalDraft.redTeam.picks.length !== 5
    ) {
      return {
        success: false,
        error: 'Both teams must have exactly 5 picks to generate a strategy',
      };
    }

    this.logger.log(
      `Generating strategy for ${finalDraft.blueTeam.name} vs ${finalDraft.redTeam.name}`,
    );

    const result = await this.cerebrasService.getPostDraftStrategy(finalDraft);

    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

}
