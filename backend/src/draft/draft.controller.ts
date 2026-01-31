import { Controller, Post, Body, Logger } from '@nestjs/common';
import { OpenAIService } from './openai.service';
import type { DraftStateForAI } from './openai.service';

@Controller('draft')
export class DraftController {
  private readonly logger = new Logger(DraftController.name);

  constructor(private readonly openaiService: OpenAIService) {}

  @Post('recommendations')
  async getRecommendations(@Body() draftState: DraftStateForAI) {
    this.logger.log(
      `Getting recommendations for ${draftState.currentTeam} team, phase: ${draftState.phase}`,
    );

    const result = await this.openaiService.getRecommendations(draftState);

    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }
}
