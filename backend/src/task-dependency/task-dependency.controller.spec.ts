import { Test, TestingModule } from '@nestjs/testing';
import { TaskDependencyController } from './task-dependency.controller';

describe('TaskDependencyController', () => {
  let controller: TaskDependencyController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TaskDependencyController],
    }).compile();

    controller = module.get<TaskDependencyController>(TaskDependencyController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
