import { Module } from '@nestjs/common';
import {
  TaskDependenciesController,
  TaskDependenciesNestedController,
} from './task-dependencies.controller';
import { TaskDependenciesService } from './task-dependencies.service';

@Module({
  controllers: [TaskDependenciesNestedController, TaskDependenciesController],
  providers: [TaskDependenciesService],
})
export class TaskDependenciesModule {}
