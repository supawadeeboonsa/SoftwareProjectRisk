import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TaskService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    projectId: number,
    data: {
      name: string;
      description?: string;
      duration: number;
      status?: string;
    },
  ) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return this.prisma.task.create({
      data: {
        projectId,
        name: data.name,
        description: data.description,
        duration: data.duration,
        status: data.status ?? 'TODO',
      },
    });
  }

  async findAll(projectId: number) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return this.prisma.task.findMany({
      where: { projectId },
      orderBy: { id: 'asc' },
    });
  }

  async findOne(id: number) {
    const task = await this.prisma.task.findUnique({
      where: { id },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return task;
  }

  async update(
    id: number,
    data: {
      name?: string;
      description?: string;
      duration?: number;
      status?: string;
    },
  ) {
    await this.findOne(id);

    return this.prisma.task.update({
      where: { id },
      data,
    });
  }

  async remove(id: number) {
    await this.findOne(id);

    return this.prisma.task.delete({
      where: { id },
    });
  }
}