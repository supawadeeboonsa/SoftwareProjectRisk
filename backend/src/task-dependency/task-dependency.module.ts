import { Module } from '@nestjs/common';
import { TaskDependencyController } from './task-dependency.controller';
import { TaskDependencyService } from './task-dependency.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TaskDependencyController],
  providers: [TaskDependencyService],
})
export class TaskDependencyModule {}