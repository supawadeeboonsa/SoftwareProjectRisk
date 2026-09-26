import { Module } from '@nestjs/common';
import {
  ScenarioChangesController,
  ScenarioChangesNestedController,
} from './scenario-changes.controller';
import { ScenarioChangesService } from './scenario-changes.service';
import { ProjectScenariosController, ScenariosController } from './scenarios.controller';
import { ScenariosService } from './scenarios.service';

@Module({
  controllers: [
    ProjectScenariosController,
    ScenariosController,
    ScenarioChangesNestedController,
    ScenarioChangesController,
  ],
  providers: [ScenariosService, ScenarioChangesService],
  exports: [ScenariosService], // SimulationsModule ใช้ getScenarioOrThrow/assertProjectExists ต่อ
})
export class ScenariosModule {}
