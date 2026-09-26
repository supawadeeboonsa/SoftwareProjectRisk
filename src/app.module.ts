import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { ProjectsModule } from './projects/projects.module';
import { RisksModule } from './risks/risks.module';
import { ScenariosModule } from './scenarios/scenarios.module';
import { SimulationsModule } from './simulations/simulations.module';
import { TaskDependenciesModule } from './task-dependencies/task-dependencies.module';
import { TasksModule } from './tasks/tasks.module';

@Module({
  imports: [
    PrismaModule,
    ProjectsModule,
    TasksModule,
    TaskDependenciesModule,
    RisksModule,
    ScenariosModule,
    SimulationsModule,
  ],
})
export class AppModule {}
