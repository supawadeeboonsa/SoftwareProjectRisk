import { Controller, Get, HttpCode, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { SimulationsService } from './simulations.service';

// POST /scenarios/:scenarioId/simulate, GET /scenarios/:scenarioId/simulations
@Controller('scenarios/:scenarioId')
export class ScenarioSimulationsController {
  constructor(private readonly simulationsService: SimulationsService) {}

  @Post('simulate')
  @HttpCode(201)
  simulate(@Param('scenarioId', ParseUUIDPipe) scenarioId: string) {
    return this.simulationsService.simulate(scenarioId);
  }

  @Get('simulations')
  findAll(@Param('scenarioId', ParseUUIDPipe) scenarioId: string) {
    return this.simulationsService.findAllForScenario(scenarioId);
  }
}

// GET /simulations/:id
@Controller('simulations')
export class SimulationsController {
  constructor(private readonly simulationsService: SimulationsService) {}

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.simulationsService.findOne(id);
  }
}
