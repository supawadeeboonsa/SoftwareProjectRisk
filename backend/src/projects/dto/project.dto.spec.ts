import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateProjectDto } from './create-project.dto';
import { UpdateProjectDto } from './update-project.dto';

// ตัวเลือกเดียวกับ ValidationPipe ใน app.setup.ts
const opts = { whitelist: true, forbidNonWhitelisted: true };

const valid = {
  name: 'E-Commerce Platform',
  startDate: '2026-01-01',
  endDate: '2026-03-01',
  budget: 100000,
  teamSize: 5,
};

async function errorsOf<T extends object>(cls: new () => T, body: unknown) {
  const errors = await validate(plainToInstance(cls, body) as object, opts);
  return errors.map((e) => e.property);
}

describe('CreateProjectDto', () => {
  it('ข้อมูลถูกต้อง → ผ่าน', async () => {
    expect(await errorsOf(CreateProjectDto, valid)).toEqual([]);
    expect(await errorsOf(CreateProjectDto, { ...valid, status: 'ON_HOLD', description: 'x' })).toEqual([]);
  });

  it('name: ห้ามขาด / ว่าง / มีแต่ช่องว่าง', async () => {
    const { name, ...noName } = valid;
    expect(await errorsOf(CreateProjectDto, noName)).toContain('name');
    expect(await errorsOf(CreateProjectDto, { ...valid, name: '' })).toContain('name');
    expect(await errorsOf(CreateProjectDto, { ...valid, name: '   ' })).toContain('name');
  });

  it('budget: ห้ามติดลบ, ห้ามเป็น string, ทศนิยมไม่เกิน 2 ตำแหน่ง; 0 ใช้ได้', async () => {
    expect(await errorsOf(CreateProjectDto, { ...valid, budget: -1 })).toContain('budget');
    expect(await errorsOf(CreateProjectDto, { ...valid, budget: '100' })).toContain('budget');
    expect(await errorsOf(CreateProjectDto, { ...valid, budget: 1.234 })).toContain('budget');
    expect(await errorsOf(CreateProjectDto, { ...valid, budget: 0 })).toEqual([]);
  });

  it('teamSize: ต้องเป็นจำนวนเต็ม >= 1', async () => {
    expect(await errorsOf(CreateProjectDto, { ...valid, teamSize: 0 })).toContain('teamSize');
    expect(await errorsOf(CreateProjectDto, { ...valid, teamSize: 2.5 })).toContain('teamSize');
    expect(await errorsOf(CreateProjectDto, { ...valid, teamSize: '5' })).toContain('teamSize');
    expect(await errorsOf(CreateProjectDto, { ...valid, teamSize: 1 })).toEqual([]);
  });

  it('วันที่: ต้อง YYYY-MM-DD และเป็นวันที่จริง', async () => {
    expect(await errorsOf(CreateProjectDto, { ...valid, startDate: '01/01/2026' })).toContain('startDate');
    expect(await errorsOf(CreateProjectDto, { ...valid, startDate: '2026-13-01' })).toContain('startDate');
    expect(await errorsOf(CreateProjectDto, { ...valid, endDate: '2026-02-30' })).toContain('endDate');
    expect(await errorsOf(CreateProjectDto, { ...valid, endDate: 20260301 })).toContain('endDate');
    const { startDate, ...noStart } = valid;
    expect(await errorsOf(CreateProjectDto, noStart)).toContain('startDate');
  });

  it('status: ต้องเป็นค่าที่กำหนดเท่านั้น', async () => {
    expect(await errorsOf(CreateProjectDto, { ...valid, status: 'DONE' })).toContain('status');
    expect(await errorsOf(CreateProjectDto, { ...valid, status: 'planning' })).toContain('status');
    for (const s of ['PLANNING', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED']) {
      expect(await errorsOf(CreateProjectDto, { ...valid, status: s })).toEqual([]);
    }
  });

  it('ปฏิเสธ field ที่ไม่รู้จัก', async () => {
    expect(await errorsOf(CreateProjectDto, { ...valid, hacker: true })).toContain('hacker');
  });
});

describe('UpdateProjectDto', () => {
  it('ส่งบางส่วนได้', async () => {
    expect(await errorsOf(UpdateProjectDto, {})).toEqual([]);
    expect(await errorsOf(UpdateProjectDto, { teamSize: 3 })).toEqual([]);
  });

  it('ค่าที่ส่งมาต้องถูกต้องเหมือนตอนสร้าง', async () => {
    expect(await errorsOf(UpdateProjectDto, { teamSize: 0 })).toContain('teamSize');
    expect(await errorsOf(UpdateProjectDto, { budget: -5 })).toContain('budget');
    expect(await errorsOf(UpdateProjectDto, { name: '   ' })).toContain('name');
    expect(await errorsOf(UpdateProjectDto, { status: 'X' })).toContain('status');
  });
});
