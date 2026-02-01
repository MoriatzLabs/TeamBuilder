import { Module } from '@nestjs/common';
import { SampleMatchesController } from './sample-matches.controller';
import { SampleMatchesService } from './sample-matches.service';

@Module({
  controllers: [SampleMatchesController],
  providers: [SampleMatchesService],
  exports: [SampleMatchesService],
})
export class SampleMatchesModule {}
