import { Test, TestingModule } from '@nestjs/testing';
import { TaskDependencyService } from './task-dependency.service';

describe('TaskDependencyService', () => {
  let service: TaskDependencyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TaskDependencyService],
    }).compile();

    service = module.get<TaskDependencyService>(TaskDependencyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
