// ต้องตรงกับ enum ProjectStatus ใน prisma/schema.prisma
// (รูปแบบเดียวกับที่ Prisma generate ให้: const object + union type)
export const ProjectStatus = {
  PLANNING: 'PLANNING',
  IN_PROGRESS: 'IN_PROGRESS',
  ON_HOLD: 'ON_HOLD',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;

export type ProjectStatus = (typeof ProjectStatus)[keyof typeof ProjectStatus];
