import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';

import { TaskService } from './task.service';

@Controller()
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Post('projects/:projectId/tasks')
  create(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Body()
    body: {
      name: string;
      description?: string;
      duration: number;
      status?: string;
    },
  ) {
    return this.taskService.create(projectId, body);
  }

  @Get('projects/:projectId/tasks')
  findAll(
    @Param('projectId', ParseIntPipe) projectId: number,
  ) {
    return this.taskService.findAll(projectId);
  }

  @Get('tasks/:id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.taskService.findOne(id);
  }

  @Patch('tasks/:id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      name?: string;
      description?: string;
      duration?: number;
      status?: string;
    },
  ) {
    return this.taskService.update(id, body);
  }

  @Delete('tasks/:id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.taskService.remove(id);
  }
}