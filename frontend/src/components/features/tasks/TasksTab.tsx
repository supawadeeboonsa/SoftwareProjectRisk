'use client';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { TaskStatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field, Select, TextArea, TextInput } from '@/components/ui/Field';
import { ConfirmDialog, Modal } from '@/components/ui/Modal';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { api, ApiError } from '@/lib/api';
import { TASK_STATUSES, TASK_STATUS_LABEL } from '@/lib/labels';
import { useFetch } from '@/lib/useFetch';
import type { Task, TaskDependency, TaskStatus } from '@/types/api';

function TaskFormModal({ open, projectId, task, onClose, onSaved }: {
  open: boolean; projectId: string; task?: Task; onClose: () => void; onSaved: () => void;
}) {
  const toast = useToast();
  const [name, setName] = useState(task?.name ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [duration, setDuration] = useState(task ? String(task.duration) : '');
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? 'TODO');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  async function submit(ev: FormEvent) {
    ev.preventDefault();
    if (saving) return;
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'กรุณากรอกชื่องาน';
    if (!Number.isInteger(Number(duration)) || Number(duration) < 1) e.duration = 'ระยะเวลาต้องเป็นจำนวนเต็มวันตั้งแต่ 1 ขึ้นไป';
    setErrors(e);
    if (Object.keys(e).length) return;

    setSaving(true);
    const body = { name: name.trim(), description: description.trim() || undefined, duration: Number(duration), status };
    try {
      if (task) await api.tasks.update(task.id, body);
      else await api.tasks.create(projectId, body);
      toast('success', task ? 'บันทึกงานแล้ว' : 'เพิ่มงานแล้ว');
      onSaved();
      onClose();
    } catch (err) {
      toast('error', err instanceof ApiError ? err.message : 'บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={task ? 'แก้ไขงาน' : 'เพิ่มงาน'} open={open} onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <Field label="ชื่องาน" htmlFor="t-name" error={errors.name}>
          <TextInput id="t-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={200} />
        </Field>
        <Field label="รายละเอียด (ไม่บังคับ)" htmlFor="t-desc">
          <TextArea id="t-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <Field label="ระยะเวลา (วันปฏิทิน)" htmlFor="t-dur" error={errors.duration}>
          <TextInput id="t-dur" type="number" min={1} step={1} value={duration} onChange={(e) => setDuration(e.target.value)} />
        </Field>
        <Field label="สถานะ" htmlFor="t-status">
          <Select id="t-status" value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)}>
            {TASK_STATUSES.map((s) => <option key={s} value={s}>{TASK_STATUS_LABEL[s]}</option>)}
          </Select>
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>ยกเลิก</Button>
          <Button type="submit" loading={saving}>บันทึก</Button>
        </div>
      </form>
    </Modal>
  );
}

// เลือก "งานที่ต้องเสร็จก่อน" จากรายการ — ไม่ให้ผู้ใช้กรอก UUID เอง
function DependencyEditor({ task, tasks, deps, onChanged }: {
  task: Task; tasks: Task[]; deps: TaskDependency[]; onChanged: () => void;
}) {
  const toast = useToast();
  const [selected, setSelected] = useState('');
  const [busy, setBusy] = useState(false);
  const nameOf = (id: string) => tasks.find((t) => t.id === id)?.name ?? id;
  const available = tasks.filter((t) => t.id !== task.id && !deps.some((d) => d.dependsOnTaskId === t.id));

  async function add() {
    if (!selected || busy) return;
    setBusy(true);
    try {
      await api.dependencies.create(task.id, selected);
      toast('success', 'เพิ่มความสัมพันธ์แล้ว');
      setSelected('');
      onChanged();
    } catch (e) {
      // Backend ตรวจ self / ข้ามโครงการ / ซ้ำ / วงจร (circular) และตอบข้อความที่อ่านเข้าใจ
      toast('error', e instanceof ApiError ? e.message : 'เพิ่มไม่สำเร็จ');
    } finally { setBusy(false); }
  }

  async function remove(id: string) {
    if (busy) return;
    setBusy(true);
    try { await api.dependencies.remove(id); toast('success', 'ลบความสัมพันธ์แล้ว'); onChanged(); }
    catch (e) { toast('error', e instanceof ApiError ? e.message : 'ลบไม่สำเร็จ'); }
    finally { setBusy(false); }
  }

  return (
    <div className="mt-3 rounded-lg bg-surface-container-low p-3">
      <p className="mb-2 text-label-md text-on-surface-variant">ต้องทำหลังจาก (งานที่ต้องเสร็จก่อน)</p>
      {deps.length === 0 ? <p className="text-caption text-on-surface-variant">เริ่มได้ทันที ไม่ต้องรองาน</p> : (
        <ul className="mb-2 flex flex-wrap gap-2">
          {deps.map((d) => (
            <li key={d.id} className="flex items-center gap-1 rounded-full bg-primary-fixed px-3 py-1 text-label-sm text-primary">
              ← {nameOf(d.dependsOnTaskId)}
              <button type="button" onClick={() => remove(d.id)} disabled={busy} aria-label={`ลบความสัมพันธ์กับ ${nameOf(d.dependsOnTaskId)}`}
                className="focus-ring ml-1 rounded px-1 font-bold">×</button>
            </li>
          ))}
        </ul>
      )}
      {available.length > 0 && (
        <div className="flex flex-col gap-2 md:flex-row">
          <label htmlFor={`dep-${task.id}`} className="sr-only">เลือกงานที่ต้องเสร็จก่อน</label>
          <Select id={`dep-${task.id}`} value={selected} onChange={(e) => setSelected(e.target.value)}>
            <option value="">-- เลือกงานที่ต้องเสร็จก่อน --</option>
            {available.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </Select>
          <Button variant="secondary" onClick={add} loading={busy} disabled={!selected}>เพิ่ม</Button>
        </div>
      )}
    </div>
  );
}

export function TasksTab({ projectId }: { projectId: string }) {
  const toast = useToast();
  const { data: tasks, error, loading, reload } = useFetch(() => api.tasks.list(projectId), [projectId]);
  const [depsByTask, setDepsByTask] = useState<Record<string, TaskDependency[]>>({});
  const [depsVersion, setDepsVersion] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Task | undefined>();
  const [formKey, setFormKey] = useState(0);
  const [deleting, setDeleting] = useState<Task | null>(null);
  const [busy, setBusy] = useState(false);

  // โหลด dependency ของทุก task (Backend มี endpoint ต่อ task)
  useEffect(() => {
    if (!tasks) return;
    let cancelled = false;
    Promise.all(tasks.map((t) => api.dependencies.list(t.id).then((d) => [t.id, d] as const)))
      .then((pairs) => { if (!cancelled) setDepsByTask(Object.fromEntries(pairs)); })
      .catch(() => { if (!cancelled) toast('error', 'โหลดความสัมพันธ์ของงานไม่สำเร็จ'); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, depsVersion]);

  const totalDuration = useMemo(() => (tasks ?? []).reduce((s, t) => s + t.duration, 0), [tasks]);

  function openForm(t?: Task) { setEditing(t); setFormKey((k) => k + 1); setFormOpen(true); }

  async function confirmDelete() {
    if (!deleting || busy) return;
    setBusy(true);
    try { await api.tasks.remove(deleting.id); toast('success', 'ลบงานแล้ว'); setDeleting(null); reload(); }
    catch (e) { toast('error', e instanceof ApiError ? e.message : 'ลบไม่สำเร็จ'); }
    finally { setBusy(false); }
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-body-md text-on-surface-variant">
          {tasks?.length ?? 0} งาน · รวมระยะเวลาทุกงาน {totalDuration} วัน (ระยะเวลาโครงการจริงคำนวณด้วย Critical Path ตอนจำลองสถานการณ์)
        </p>
        <Button onClick={() => openForm()}>+ เพิ่มงาน</Button>
      </div>

      {tasks && tasks.length === 0 ? (
        <Card><EmptyState title="ยังไม่มีงานในโครงการนี้" description="เพิ่มงานก่อน แล้วกำหนดลำดับงานที่ต้องทำต่อกัน"
          action={<Button onClick={() => openForm()}>+ เพิ่มงาน</Button>} /></Card>
      ) : (
        <div className="flex flex-col gap-3">
          {tasks?.map((t) => (
            <Card key={t.id}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-display text-headline-md">{t.name}</p>
                  {t.description && <p className="text-body-md text-on-surface-variant">{t.description}</p>}
                  <p className="mt-1 text-label-md text-on-surface-variant">ระยะเวลา {t.duration} วัน</p>
                </div>
                <div className="flex items-center gap-2">
                  <TaskStatusBadge status={t.status} />
                  <Button variant="secondary" onClick={() => openForm(t)}>แก้ไข</Button>
                  <Button variant="ghost" className="text-error" onClick={() => setDeleting(t)}>ลบ</Button>
                </div>
              </div>
              <DependencyEditor task={t} tasks={tasks} deps={depsByTask[t.id] ?? []} onChanged={() => setDepsVersion((v) => v + 1)} />
            </Card>
          ))}
        </div>
      )}

      <TaskFormModal key={formKey} open={formOpen} projectId={projectId} task={editing} onClose={() => setFormOpen(false)} onSaved={reload} />
      <ConfirmDialog open={!!deleting} title="ลบงาน" message={`ต้องการลบ "${deleting?.name}" ใช่หรือไม่? ความสัมพันธ์ของงานนี้จะถูกลบด้วย`}
        loading={busy} onConfirm={confirmDelete} onCancel={() => setDeleting(null)} />
    </div>
  );
}
