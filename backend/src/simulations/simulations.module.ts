import { Module } from '@nestjs/common';
import { ScenariosModule } from '../scenarios/scenarios.module';
import { ScenarioSimulationsController, SimulationsController } from './simulations.controller';
import { SimulationsService } from './simulations.service';

@Module({
  imports: [ScenariosModule], // ใช้ ScenariosService.getScenarioOrThrow
  controllers: [ScenarioSimulationsController, SimulationsController],
  providers: [SimulationsService],
})
export class SimulationsModule {}
