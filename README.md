# SoftwareProjectRisk — Backend (Phase 1: Project, Phase 2: Task/Dependency/CPM, Phase 3: Risk, Phase 4: Scenario/Simulation)

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

## Phase 3 — Risk Management + Risk Calculator

### API

| Method | Path | ผลลัพธ์ |
|---|---|---|
| GET | /projects/:projectId/risks | 200 / 404 (project ไม่มีอยู่) |
| POST | /projects/:projectId/risks | 201 / 400 / 404 |
| GET | /risks/:id | 200 / 404 |
| PATCH | /risks/:id | 200 / 400 / 404 |
| DELETE | /risks/:id | 204 / 404 |

### Risk Calculator (`src/risks/risk-calculator.ts`)
Pure function ไม่พึ่ง Database: `calculateRiskScore(p, i) = p × i`, `calculateRiskLevel(score)`
(1–4 LOW, 5–9 MEDIUM, 10–16 HIGH, 17–25 CRITICAL), `calculateRisk(p, i)` รวมทั้งสอง
ทั้งหมด throw `RangeError` ถ้า probability/impact ไม่ใช่จำนวนเต็ม 1–5

### Backend เป็น Source of Truth สำหรับ score/level
- `CreateRiskDto`/`UpdateRiskDto` **ไม่มี field `score`/`level`** และ `ValidationPipe` ตั้ง `forbidNonWhitelisted`
  (ดู `app.setup.ts`) ดังนั้นถ้า client ส่ง `score`/`level` มาใน body จะได้ **400** ทันที
  (ข้อความ `"property score should not exist"`) ไม่ใช่แค่ถูกเพิกเฉย
- ตอน `PATCH` ถ้าส่งแค่ `probability` หรือแค่ `impact` มาอย่างเดียว ระบบใช้ค่าที่เหลือจากของเดิมในฐานข้อมูล
  แล้ว **คำนวณ score/level ใหม่เสมอ** (ไม่ใช่คำนวณเฉพาะตอนที่ทั้งคู่เปลี่ยน)

### กฎ Risk
`name` จำเป็น ไม่ว่าง, `probability`/`impact` จำนวนเต็ม 1–5 (reject 0, ติดลบ, ทศนิยม, string, >5),
`description`/`mitigation`/`contingency`/`owner` optional, `projectId` (path) ต้องมี Project อยู่จริงก่อน

## Phase 4 — Scenario + Simulation

### API

| Method | Path | ผลลัพธ์ |
|---|---|---|
| GET/POST | /projects/:projectId/scenarios | 200/201, 404 |
| GET | /scenarios/:id | 200 (รวม `changes`), 404 |
| DELETE | /scenarios/:id | 204, 404 (cascade ลบ changes + simulations) |
| GET/POST | /scenarios/:scenarioId/changes | 200/201, 400, 404 |
| DELETE | /scenario-changes/:id | 204, 404 |
| POST | /scenarios/:scenarioId/simulate | 201, 400 (ไม่มี change), 404, 409 (ข้อมูลอ้างอิงหายไปแล้ว) |
| GET | /scenarios/:scenarioId/simulations | 200 (ประวัติการรัน) |
| GET | /simulations/:id | 200, 404 |

**หมายเหตุ:** ไม่มี `PATCH /scenarios/:id` เพราะ Business Logic Freeze ไม่ได้ระบุการแก้ไข Scenario หลังสร้าง
(ต้องการแก้ ให้ลบ Scenario เดิมแล้วสร้างใหม่ หรือแจ้งถ้าต้องการเพิ่ม endpoint นี้)

### Pure Logic (`src/simulation-engine/`, ไม่พึ่ง Database)
- `team-size-elasticity.ts` — `D_new = D_old × ((1-p) + p×(T_old/T_new))`, ปัดด้วย `Math.round`, `p` default = 0.5
- `budget-change.ts` — `change = after - before`, `changePercent = null` เมื่อ `before = 0`
- `simulation-engine.ts` — ประกอบ CPM (Phase 2) + Risk Calculator (Phase 3) + สองไฟล์ข้างบนเข้าด้วยกัน
  **ไม่สร้างสูตรใหม่ซ้ำซ้อน** ตามข้อกำหนด

### ลำดับการคำนวณ Duration (ทางเลือกที่เราเลือกเอง — Freeze ไม่ได้ระบุละเอียดขนาดนี้)
1. Apply `TASK_DURATION` changes เข้ากับ Task ที่เกี่ยวข้อง
2. รัน CPM ใหม่ทั้งหมด (ตาม Freeze ข้อ 5 — ห้ามบวก duration ตรงๆ)
3. ถ้ามี `TEAM_SIZE` change: ใช้ผลจากข้อ 2 เป็น `D_old` แล้วคูณ elasticity อีกที

วิธีนี้ทำให้เปลี่ยน `TASK_DURATION` และ `TEAM_SIZE` พร้อมกันใน Scenario เดียวได้ถูกต้อง และให้ผลเหมือนกับ
คูณที่ Project Duration ตรงๆ ทุกกรณีที่ไม่มี `TASK_DURATION` change

### ⚠️ ตัวเลข Duration ตัวอย่างใน Business Logic Spec คำนวณผิด
Spec ระบุ demo "57 วัน, team 5→3, p=0.5 → ~66.5 ≈ 67 วัน" แต่คำนวณจากสูตรจริงตามที่ Freeze ยืนยัน (p=0.5) แล้วได้:
```
57 × ((1-0.5) + 0.5×(5/3)) = 57 × (4/3) = 76 วัน (พอดี ไม่ต้องปัดเศษ)
```
โค้ดและเทสต์ทั้งหมดยึดผลจากสูตรจริง (**76** ไม่ใช่ 67) ตามกฎ "ห้าม hardcode ผลลัพธ์" — ยืนยันด้วย
`simulation-engine.spec.ts` และ `simulations.api.spec.ts` (ยิง HTTP จริงจนจบ reproduce demo scenario เป๊ะ)

### Validation (Freeze ข้อ 14, ตรวจที่ ScenarioChangesService ตาม factor)
| Factor | ต้องมี | ต้องไม่มี | ช่วงค่า |
|---|---|---|---|
| `BUDGET` | — | taskId, riskId | >= 0 |
| `TEAM_SIZE` | — | taskId, riskId | จำนวนเต็ม >= 1 |
| `TASK_DURATION` | taskId (ต้องอยู่ project เดียวกับ scenario) | riskId | จำนวนเต็ม >= 1 |
| `RISK_PROBABILITY` / `RISK_IMPACT` | riskId (ต้องอยู่ project เดียวกับ scenario) | taskId | จำนวนเต็ม 1–5 |

### Simulation เป็น Virtual Calculation เท่านั้น
`SimulationsService.simulate()` **ไม่แก้ไข** `Project`/`Task`/`Risk` ในฐานข้อมูลเลย (Freeze ข้อ 16) เป็นการอ่านค่า
ปัจจุบันมาคำนวณแล้วบันทึกผลลงตาราง `simulations` เท่านั้น รันซ้ำกี่ครั้งก็ได้ผลเหมือนเดิมถ้าข้อมูลต้นทางไม่เปลี่ยน
(Deterministic ตาม Freeze ข้อ 12) — ถ้า Task/Risk ที่ ScenarioChange อ้างถึงถูกลบไปหลังสร้าง Scenario แล้ว จะได้ 409
ตอนสั่ง simulate (ไม่ใช่ error ทั่วไป เพราะเป็นความไม่สอดคล้องของข้อมูล ไม่ใช่ระบบเสีย)
