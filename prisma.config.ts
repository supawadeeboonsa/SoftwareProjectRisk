import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // อ่านจาก .env (ดู .env.example) ห้าม hardcode credential
    url: process.env.DATABASE_URL ?? '',
  },
});
