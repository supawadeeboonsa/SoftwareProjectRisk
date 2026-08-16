import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProjectService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    name: string;
    description?: string;
    startDate?: string;
    endDate?: string;
  }) {
    return this.prisma.project.create({
      data: {
        name: data.name,
        description: data.description,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
      },
    });
  }

  async findAll() {
    return this.prisma.project.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: number) {
    return this.prisma.project.findUnique({
      where: { id },
      include: {
        tasks: true,
        risks: true,
        scenarios: true,
      },
    });
  }

  async update(
    id: number,
    data: {
      name?: string;
      description?: string;
      startDate?: string;
      endDate?: string;
      status?: string;
    },
  ) {
    return this.prisma.project.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        status: data.status,
      },
    });
  }

  async remove(id: number) {
    return this.prisma.project.delete({
      where: { id },
    });
  }
}