import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateTaskDto } from './create-task.dto';
import { UpdateTaskDto } from './update-task.dto';

const opts = { whitelist: true, forbidNonWhitelisted: true };
const valid = { name: 'Backend Development', duration: 15 };

async function errorsOf<T extends object>(cls: new () => T, body: unknown) {
  return (await validate(plainToInstance(cls, body) as object, opts)).map((e) => e.property);
}

describe('CreateTaskDto', () => {
  it('ข้อมูลถูกต้อง → ผ่าน', async () => {
    expect(await errorsOf(CreateTaskDto, valid)).toEqual([]);
    expect(await errorsOf(CreateTaskDto, { ...valid, status: 'IN_PROGRESS', description: 'x' })).toEqual([]);
  });

  it('name: ห้ามขาด/ว่าง/มีแต่ช่องว่าง', async () => {
    expect(await errorsOf(CreateTaskDto, { duration: 5 })).toContain('name');
    expect(await errorsOf(CreateTaskDto, { ...valid, name: '' })).toContain('name');
    expect(await errorsOf(CreateTaskDto, { ...valid, name: '   ' })).toContain('name');
  });

  it('duration: ต้องเป็นจำนวนเต็ม >= 1', async () => {
    expect(await errorsOf(CreateTaskDto, { ...valid, duration: 0 })).toContain('duration');
    expect(await errorsOf(CreateTaskDto, { ...valid, duration: -1 })).toContain('duration');
    expect(await errorsOf(CreateTaskDto, { ...valid, duration: 2.5 })).toContain('duration');
    expect(await errorsOf(CreateTaskDto, { ...valid, duration: '5' })).toContain('duration');
    expect(await errorsOf(CreateTaskDto, { ...valid, duration: 1 })).toEqual([]);
  });

  it('status: ต้องเป็นค่าที่กำหนดเท่านั้น', async () => {
    expect(await errorsOf(CreateTaskDto, { ...valid, status: 'DONE' })).toContain('status');
    for (const s of ['TODO', 'IN_PROGRESS', 'COMPLETED']) {
      expect(await errorsOf(CreateTaskDto, { ...valid, status: s })).toEqual([]);
    }
  });

  it('ปฏิเสธ field ที่ไม่รู้จัก', async () => {
    expect(await errorsOf(CreateTaskDto, { ...valid, projectId: 'sneaky' })).toContain('projectId');
  });
});

describe('UpdateTaskDto', () => {
  it('ส่งบางส่วนได้ แต่ค่าที่ส่งต้องถูกต้อง', async () => {
    expect(await errorsOf(UpdateTaskDto, {})).toEqual([]);
    expect(await errorsOf(UpdateTaskDto, { duration: 0 })).toContain('duration');
  });
});
