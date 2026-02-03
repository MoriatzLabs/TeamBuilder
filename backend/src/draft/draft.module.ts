import { Module } from '@nestjs/common';
import { DraftGateway } from './draft.gateway';
import { CerebrasService } from './cerebras.service';
import { DraftController } from './draft.controller';
import { SampleMatchesModule } from '../sample-matches/sample-matches.module';

@Module({
  imports: [SampleMatchesModule],
  controllers: [DraftController],
  providers: [DraftGateway, CerebrasService],
  exports: [CerebrasService],
})
export class DraftModule {}
