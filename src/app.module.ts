import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { ProjectsModule } from './projects/projects.module';
import { TaskDependenciesModule } from './task-dependencies/task-dependencies.module';
import { TasksModule } from './tasks/tasks.module';

@Module({
  imports: [PrismaModule, ProjectsModule, TasksModule, TaskDependenciesModule],
})
export class AppModule {}
