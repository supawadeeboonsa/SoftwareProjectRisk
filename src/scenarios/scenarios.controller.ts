import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { CreateScenarioDto } from './dto/create-scenario.dto';
import { ScenariosService } from './scenarios.service';

// GET/POST /projects/:projectId/scenarios
@Controller('projects/:projectId/scenarios')
export class ProjectScenariosController {
  constructor(private readonly scenariosService: ScenariosService) {}

  @Get()
  findAll(@Param('projectId', ParseUUIDPipe) projectId: string) {
    return this.scenariosService.findAllByProject(projectId);
  }

  @Post()
  create(@Param('projectId', ParseUUIDPipe) projectId: string, @Body() dto: CreateScenarioDto) {
    return this.scenariosService.create(projectId, dto);
  }
}

// GET/DELETE /scenarios/:id  (ไม่มี PATCH — Spec ไม่ได้ระบุการแก้ Scenario หลังสร้าง)
@Controller('scenarios')
export class ScenariosController {
  constructor(private readonly scenariosService: ScenariosService) {}

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.scenariosService.findOne(id);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.scenariosService.remove(id);
  }
}
