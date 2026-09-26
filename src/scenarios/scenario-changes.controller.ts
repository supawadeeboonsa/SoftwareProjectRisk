import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { CreateScenarioChangeDto } from './dto/create-scenario-change.dto';
import { ScenarioChangesService } from './scenario-changes.service';

// GET/POST /scenarios/:scenarioId/changes
@Controller('scenarios/:scenarioId/changes')
export class ScenarioChangesNestedController {
  constructor(private readonly service: ScenarioChangesService) {}

  @Get()
  findAll(@Param('scenarioId', ParseUUIDPipe) scenarioId: string) {
    return this.service.findAllForScenario(scenarioId);
  }

  @Post()
  create(
    @Param('scenarioId', ParseUUIDPipe) scenarioId: string,
    @Body() dto: CreateScenarioChangeDto,
  ) {
    return this.service.create(scenarioId, dto);
  }
}

// DELETE /scenario-changes/:id
@Controller('scenario-changes')
export class ScenarioChangesController {
  constructor(private readonly service: ScenarioChangesService) {}

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
