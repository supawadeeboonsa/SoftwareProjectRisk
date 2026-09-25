# SoftwareProjectRisk — Backend (Phase 1: Project, Phase 2: Task/Dependency/CPM)

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
  (เช่นเดียวกับ `TaskStatus` ใน `src/tasks/task-status.ts`)
- โฟลเดอร์ `src/generated/` เกิดจาก `prisma generate` (อยู่ใน .gitignore)

## Phase 2 — Task / Task Dependency / CPM

### API

| Method | Path | ผลลัพธ์ |
|---|---|---|
| GET | /projects/:projectId/tasks | 200 / 404 (project ไม่มีอยู่) |
| POST | /projects/:projectId/tasks | 201 / 400 / 404 |
| PATCH | /tasks/:id | 200 / 400 / 404 |
| DELETE | /tasks/:id | 204 / 404 (ลบจริง — dependency ที่เกี่ยวข้องถูกลบตาม, onDelete: Cascade) |
| GET | /tasks/:taskId/dependencies | 200 / 404 |
| POST | /tasks/:taskId/dependencies | 201 / 400 / 404 / 409 |
| DELETE | /task-dependencies/:id | 204 / 404 |

### กฎ Task
`name` จำเป็น ไม่ว่าง, `duration` จำนวนเต็ม >= 1 (วันปฏิทิน), `status` ต้องเป็น TODO/IN_PROGRESS/COMPLETED,
`projectId` (path) ต้องมี Project อยู่จริงก่อนจึงสร้าง/ดู Task ได้

### กฎ Task Dependency (สร้างที่ `POST /tasks/:taskId/dependencies`)
ตรวจตามลำดับ: taskId มีอยู่จริง (404) → dependsOnTaskId มีอยู่จริง (404) → ห้าม self-dependency (400)
→ ต้องอยู่ Project เดียวกัน (400) → ห้ามซ้ำ (409) → ห้ามเกิด Circular Dependency (409, ข้อความบอกเส้นทางวงจร)

**ทางเลือกที่เราเลือกเอง (ยังไม่ใช่ CSMJU2030 convention):** ทรัพยากรที่อ้างถึงจาก path param แล้วไม่พบ (`taskId`)
ตอบ 404; ทรัพยากรที่อ้างถึงจาก body แล้วไม่พบ (`dependsOnTaskId`) ก็ตอบ 404 เช่นกัน (มองเป็น "อ้างถึงของที่ไม่มีอยู่")
ส่วนกฎทางธุรกิจ (self/cross-project) ตอบ 400 และสถานะซ้ำซ้อน/ขัดแย้ง (duplicate/cycle) ตอบ 409

### Circular Dependency (`src/scheduling/circular-dependency.ts`)
Pure function ไม่พึ่ง Database:
- `findCycle(edges)` — หา cycle ใน graph ที่มีอยู่แล้ว (ใช้ใน CPM ก่อนคำนวณ)
- `wouldCreateCycle(existingEdges, newEdge)` — ตรวจ "ก่อน" เพิ่ม edge ใหม่ (ใช้ใน TaskDependenciesService)
- ตรวจได้ทั้ง direct cycle, indirect cycle, self-dependency, และ graph รูป diamond (ไม่ false-positive)

### CPM (`src/scheduling/cpm.ts`)
Pure function `calculateCPM(tasks, dependencies)`: Forward pass (ES/EF) + Backward pass (LS/LF) + Slack
Project Duration = MAX(EF ของทุก task) **ไม่ใช่** `Project.endDate - Project.startDate` (ค่านั้นเป็น Planned Schedule
ส่วนนี้คือ Calculated Schedule) รองรับงานขนาน คืน error ที่ชัดเจน (ไม่คำนวณทับ) เมื่อ: มี cycle, duration ผิด,
task id ซ้ำ หรือ dependency อ้างถึง task ที่ไม่มีอยู่ ยังเป็น Pure function เดี่ยวๆ **ยังไม่ได้ต่อเข้ากับ API**
(routes ปัจจุบันไม่มี endpoint คำนวณ CPM — รอ Phase ที่ใช้งานจริง เช่น Simulation)
