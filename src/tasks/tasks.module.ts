import { Module } from '@nestjs/common';
import { ProjectTasksController, TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

@Module({
  controllers: [ProjectTasksController, TasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
