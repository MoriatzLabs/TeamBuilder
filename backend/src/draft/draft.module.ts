import { Module } from '@nestjs/common';
import { DraftGateway } from './draft.gateway';
import { OpenAIService } from './openai.service';
import { DraftController } from './draft.controller';

@Module({
  controllers: [DraftController],
  providers: [DraftGateway, OpenAIService],
  exports: [OpenAIService],
})
export class DraftModule {}
