# SoftwareProjectRisk — Frontend

Next.js 15 (App Router) + React 19 + TypeScript + Tailwind CSS v4 · ใช้ **pnpm**

หน้าจอทั้งหมดเชื่อมกับ Backend จริง (`SoftwareProjectRisk` NestJS) ไม่มีข้อมูลจำลอง
Frontend ไม่คำนวณ Risk Score / Simulation เอง — แสดงผลจาก Backend เท่านั้น

## วิธีรัน

```bash
pnpm install
cp .env.example .env.local     # ค่าเริ่มต้น API_URL=http://localhost:3000
pnpm dev -p 3001               # Backend ใช้พอร์ต 3000 อยู่แล้ว จึงรัน Frontend ที่ 3001
```

เปิด http://localhost:3001 (ต้องรัน Backend + PostgreSQL ก่อน)

คำสั่งตรวจ: `pnpm typecheck` · `pnpm lint` · `pnpm build`

## เชื่อมต่อ Backend อย่างไร

Browser เรียก `/backend/*` (same-origin) แล้ว Next.js proxy ไปที่ `API_URL` (ดู `next.config.ts`)
จึง **ไม่ต้องแก้ Backend เพื่อเปิด CORS** · จุดเรียก API รวมอยู่ที่ `src/lib/api.ts` ไฟล์เดียว

## หน้าและ Route

| Route | เนื้อหา |
|---|---|
| `/` | Dashboard: จำนวนโครงการ/ความเสี่ยง, การกระจายระดับ, อันดับ, การจำลองล่าสุด |
| `/projects` | รายการ + ค้นหา + สร้าง/แก้ไข/ลบ |
| `/projects/[id]` | แท็บ: ภาพรวม · งานและลำดับงาน (Task + Dependency) · ความเสี่ยง · สถานการณ์จำลอง |
| `/scenarios/[id]` | เพิ่ม/ลบ Scenario Change, กด "จำลองสถานการณ์", ประวัติการจำลอง |
| `/simulations/[id]` | ผล Before/After/Change, ความเสี่ยงที่ถูกกระทบ, Impact Summary, Recommendation |

ผู้ใช้เลือก Task/Risk จากรายการเสมอ ไม่ต้องกรอก UUID · ทุกหน้ามี Loading / Empty / Error,
ยืนยันก่อนลบ, กันกดซ้ำ (ปุ่มแสดงสถานะกำลังส่ง)

## ⚠️ ข้อแตกต่างจากมาตรฐาน CSMJU2030 (ยังไม่ได้ทำ — ตกลงไว้ว่าทำ Frontend ก่อน)

1. **ไม่ได้ใช้ `@csmju2030/design-system` จริง** ติดตั้งไม่ได้เพราะต้อง token ของ GitHub Packages ขององค์กร
   จึงประกาศ Design Token (สี/ฟอนต์/ขนาดตัวอักษร) ชุดเดียวกับเอกสารไว้ใน `src/app/globals.css` และทำ
   AppShell/Button/Card/Modal เองใน `src/components/ui/` — เมื่อได้สิทธิ์แล้วควรสลับไปใช้ package จริง
2. **ไม่มี Auth / SSO** เพราะ Backend ยังไม่มี
3. **รูปแบบ Response ตาม Backend ปัจจุบัน** (raw JSON, error แบบ NestJS `{statusCode,message,error}`,
   DELETE ตอบ 204, ไม่มี prefix `/api/v1`) ไม่ใช่ envelope `{success,data}` ของมาตรฐาน — ถ้าปรับ Backend
   ภายหลัง แก้ที่ `src/lib/api.ts` จุดเดียว
4. **ไม่มี `GET /simulations/:id/analysis`** ใน Backend — ผลวิเคราะห์ (`impactSummary`, `recommendation`)
   มากับ `GET /simulations/:id` จึงแสดงรวมในหน้า `/simulations/[id]`
5. ฟอนต์โหลดผ่านแท็ก `<link>` ของ Google Fonts (ไม่ใช้ `next/font`)
6. เงินแสดงเป็น "บาท" ตามที่ Backend เก็บ (Decimal) ไม่ใช่สตางค์แบบที่มาตรฐานกำหนด
