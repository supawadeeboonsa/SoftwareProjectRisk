import { Module } from '@nestjs/common';
import { ProjectRisksController, RisksController } from './risks.controller';
import { RisksService } from './risks.service';

@Module({
  controllers: [ProjectRisksController, RisksController],
  providers: [RisksService],
})
export class RisksModule {}
