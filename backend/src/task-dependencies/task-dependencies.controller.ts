import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { CreateTaskDependencyDto } from './dto/create-task-dependency.dto';
import { TaskDependenciesService } from './task-dependencies.service';

// GET/POST /tasks/:taskId/dependencies
@Controller('tasks/:taskId/dependencies')
export class TaskDependenciesNestedController {
  constructor(private readonly service: TaskDependenciesService) {}

  @Get()
  findAll(@Param('taskId', ParseUUIDPipe) taskId: string) {
    return this.service.findAllForTask(taskId);
  }

  @Post()
  create(@Param('taskId', ParseUUIDPipe) taskId: string, @Body() dto: CreateTaskDependencyDto) {
    return this.service.create(taskId, dto);
  }
}

// DELETE /task-dependencies/:id
@Controller('task-dependencies')
export class TaskDependenciesController {
  constructor(private readonly service: TaskDependenciesService) {}

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
