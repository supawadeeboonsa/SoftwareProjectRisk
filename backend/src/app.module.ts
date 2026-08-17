import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { ProjectModule } from './project/project.module';
import { TaskModule } from './task/task.module';
import { TaskDependencyModule } from './task-dependency/task-dependency.module';

@Module({
  imports: [
    PrismaModule,
    ProjectModule,
    TaskModule,
    TaskDependencyModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}