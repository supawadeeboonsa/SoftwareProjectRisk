import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { CreateRiskDto } from './dto/create-risk.dto';
import { UpdateRiskDto } from './dto/update-risk.dto';
import { RisksService } from './risks.service';

// GET/POST /projects/:projectId/risks
@Controller('projects/:projectId/risks')
export class ProjectRisksController {
  constructor(private readonly risksService: RisksService) {}

  @Get()
  findAll(@Param('projectId', ParseUUIDPipe) projectId: string) {
    return this.risksService.findAllByProject(projectId);
  }

  @Post()
  create(@Param('projectId', ParseUUIDPipe) projectId: string, @Body() dto: CreateRiskDto) {
    return this.risksService.create(projectId, dto);
  }
}

// GET/PATCH/DELETE /risks/:id
@Controller('risks')
export class RisksController {
  constructor(private readonly risksService: RisksService) {}

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.risksService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateRiskDto) {
    return this.risksService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.risksService.remove(id);
  }
}
