# SoftwareProjectRisk — Backend (Phase 1: Foundation + Project)

NestJS + TypeScript + REST + PostgreSQL + Prisma 7

> สถานะ: ยังไม่มี CSMJU2030 Standards ให้ตรวจ จึง **ยังไม่ได้ตรวจความสอดคล้องกับมาตรฐานกลาง**
> (ID, route, รูปแบบ error, OpenAPI, Auth ฯลฯ เป็นค่าที่เราเลือกเองชั่วคราว) และ Phase 1 ยังไม่มี Auth

## เริ่มใช้งาน

```bash
npm install
cp .env.example .env          # แก้ DATABASE_URL ให้ตรงกับ PostgreSQL ของคุณ
npm run prisma:generate       # สร้าง Prisma client (ต้องต่อเน็ตเพื่อโหลด engine ครั้งแรก)
npm run prisma:migrate        # สร้างตาราง projects (ครั้งแรกตั้งชื่อ migration เช่น init)
npm run typecheck
npm test
npm run start:dev             # http://localhost:3000
```

## API

| Method | Path | ผลลัพธ์ |
|---|---|---|
| GET | /projects | 200 รายการทั้งหมด (ใหม่สุดก่อน) |
| POST | /projects | 201 สร้าง Project |
| GET | /projects/:id | 200 / 404 |
| PATCH | /projects/:id | 200 / 400 / 404 (ส่งเฉพาะ field ที่แก้) |
| DELETE | /projects/:id | 204 / 404 (ลบจริง — Hard delete) |

`:id` เป็น UUID; error ที่ไม่ใช่ UUID ตอบ 400

## กฎ Validation

- `name` จำเป็น ไม่ว่าง (ตัดช่องว่างหัวท้าย) ยาวไม่เกิน 200
- `startDate`, `endDate` จำเป็น รูปแบบ `YYYY-MM-DD` เป็นวันที่จริง และ `startDate <= endDate`
  (ตอน PATCH ตรวจร่วมกับค่าเดิมในฐานข้อมูล)
- `budget` ตัวเลข >= 0 ทศนิยมไม่เกิน 2 ตำแหน่ง (ไม่รับ string)
- `teamSize` จำนวนเต็ม >= 1
- `status` ต้องเป็น PLANNING / IN_PROGRESS / ON_HOLD / COMPLETED / CANCELLED (ไม่ส่ง = PLANNING)
- field ที่ไม่รู้จักถูกปฏิเสธด้วย 400

## Error

ใช้รูปแบบ exception มาตรฐานของ NestJS: `{ "message": ..., "error": ..., "statusCode": ... }`
ฐานข้อมูลต่อไม่ได้ → 503, error อื่นจากฐานข้อมูล → 500 (รายละเอียดอยู่ใน log ไม่ส่งให้ client)

## หมายเหตุ

- `ProjectStatus` ใน `src/projects/project-status.ts` ต้องตรงกับ enum ใน `prisma/schema.prisma`
- โฟลเดอร์ `src/generated/` เกิดจาก `prisma generate` (อยู่ใน .gitignore)
