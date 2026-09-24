import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
// ไฟล์นี้เกิดจาก `npm run prisma:generate` (ดู prisma/schema.prisma)
import { PrismaClient } from '../generated/prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
    });
  }

  async onModuleInit() {
    if (!process.env.DATABASE_URL) {
      this.logger.warn('DATABASE_URL is not set (see .env.example)');
    }
    try {
      await this.$connect();
      this.logger.log('Database connection OK');
    } catch (error) {
      // ไม่ให้แอปล้มตอนเริ่ม เพื่อให้ยังทดสอบ validation ได้
      // request ที่ต้องใช้ DB จะตอบ 503 (ดู ProjectsService)
      this.logger.error(`Database connection FAILED: ${(error as Error).message}`);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
