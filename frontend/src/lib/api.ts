import type {
  CreateProjectInput, CreateRiskInput, CreateScenarioChangeInput, CreateScenarioInput,
  CreateTaskInput, Project, Risk, Scenario, ScenarioChange, Simulation, Task, TaskDependency,
  UpdateProjectInput, UpdateRiskInput, UpdateTaskInput,
} from '@/types/api';

// จุดเดียวที่กำหนด base path — เรียกผ่าน rewrite ใน next.config.ts
const BASE = '/backend';

export class ApiError extends Error {
  constructor(public status: number, message: string, public details: string[] = []) {
    super(message);
  }
}

// Backend ตอบ error เป็นรูปแบบ NestJS: { statusCode, message: string | string[], error }
async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: 'no-store',
    });
  } catch {
    throw new ApiError(0, 'เชื่อมต่อ Backend ไม่ได้ กรุณาตรวจสอบว่า Backend ทำงานอยู่');
  }

  if (res.status === 204) return undefined as T;

  // อ่านเป็นข้อความก่อน แล้วลอง parse เป็น JSON — ถ้า Backend ล่ม Next.js proxy จะตอบ
  // ข้อความธรรมดา (ไม่ใช่ JSON) ต้องไม่ทำให้ฝั่งเราพัง
  const text = await res.text();
  let data: { message?: string | string[] } | undefined;
  try {
    data = text ? JSON.parse(text) : undefined;
  } catch {
    data = undefined;
  }

  if (!res.ok) {
    // ตอบกลับที่ไม่ใช่ JSON + 5xx = proxy ต่อ Backend ไม่ได้ (Backend ไม่ทำงาน / พอร์ตผิด)
    if (data === undefined && res.status >= 500) {
      throw new ApiError(res.status, 'เชื่อมต่อ Backend ไม่ได้ กรุณาตรวจสอบว่า Backend ทำงานอยู่ที่พอร์ตใน API_URL');
    }
    const msg = data?.message;
    const details = Array.isArray(msg) ? msg : msg ? [String(msg)] : [];
    throw new ApiError(res.status, details[0] ?? `เกิดข้อผิดพลาด (${res.status})`, details);
  }
  return data as T;
}

const get = <T>(p: string) => request<T>('GET', p);
const post = <T>(p: string, b?: unknown) => request<T>('POST', p, b ?? {});
const patch = <T>(p: string, b: unknown) => request<T>('PATCH', p, b);
const del = (p: string) => request<void>('DELETE', p);

export const api = {
  projects: {
    list: () => get<Project[]>('/projects'),
    get: (id: string) => get<Project>(`/projects/${id}`),
    create: (b: CreateProjectInput) => post<Project>('/projects', b),
    update: (id: string, b: UpdateProjectInput) => patch<Project>(`/projects/${id}`, b),
    remove: (id: string) => del(`/projects/${id}`),
  },
  tasks: {
    list: (projectId: string) => get<Task[]>(`/projects/${projectId}/tasks`),
    create: (projectId: string, b: CreateTaskInput) => post<Task>(`/projects/${projectId}/tasks`, b),
    update: (id: string, b: UpdateTaskInput) => patch<Task>(`/tasks/${id}`, b),
    remove: (id: string) => del(`/tasks/${id}`),
  },
  dependencies: {
    list: (taskId: string) => get<TaskDependency[]>(`/tasks/${taskId}/dependencies`),
    create: (taskId: string, dependsOnTaskId: string) =>
      post<TaskDependency>(`/tasks/${taskId}/dependencies`, { dependsOnTaskId }),
    remove: (id: string) => del(`/task-dependencies/${id}`),
  },
  risks: {
    list: (projectId: string) => get<Risk[]>(`/projects/${projectId}/risks`),
    create: (projectId: string, b: CreateRiskInput) => post<Risk>(`/projects/${projectId}/risks`, b),
    update: (id: string, b: UpdateRiskInput) => patch<Risk>(`/risks/${id}`, b),
    remove: (id: string) => del(`/risks/${id}`),
  },
  scenarios: {
    list: (projectId: string) => get<Scenario[]>(`/projects/${projectId}/scenarios`),
    get: (id: string) => get<Scenario>(`/scenarios/${id}`),
    create: (projectId: string, b: CreateScenarioInput) =>
      post<Scenario>(`/projects/${projectId}/scenarios`, b),
    remove: (id: string) => del(`/scenarios/${id}`),
  },
  changes: {
    list: (scenarioId: string) => get<ScenarioChange[]>(`/scenarios/${scenarioId}/changes`),
    create: (scenarioId: string, b: CreateScenarioChangeInput) =>
      post<ScenarioChange>(`/scenarios/${scenarioId}/changes`, b),
    remove: (id: string) => del(`/scenario-changes/${id}`),
  },
  simulations: {
    run: (scenarioId: string) => post<Simulation>(`/scenarios/${scenarioId}/simulate`),
    listForScenario: (scenarioId: string) => get<Simulation[]>(`/scenarios/${scenarioId}/simulations`),
    get: (id: string) => get<Simulation>(`/simulations/${id}`),
  },
};
