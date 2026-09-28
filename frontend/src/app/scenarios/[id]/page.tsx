'use client';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, PageHeader } from '@/components/ui/Card';
import { Field, Select, TextInput } from '@/components/ui/Field';
import { ConfirmDialog } from '@/components/ui/Modal';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { api, ApiError } from '@/lib/api';
import { formatBaht, formatDateTime, formatNumber } from '@/lib/format';
import { FACTORS, FACTOR_LABEL } from '@/lib/labels';
import { useFetch } from '@/lib/useFetch';
import type { Scenario, ScenarioChange, ScenarioChangeFactor } from '@/types/api';

function AddChangeForm({ scenario, onAdded }: { scenario: Scenario; onAdded: () => void }) {
  const toast = useToast();
  const projectId = scenario.projectId;
  // ดึง Task/Risk ของโครงการมาให้เลือก (ไม่ให้กรอก UUID) — Backend ตรวจว่าอยู่ project เดียวกันซ้ำอีกชั้น
  const { data: tasks } = useFetch(() => api.tasks.list(projectId), [projectId]);
  const { data: risks } = useFetch(() => api.risks.list(projectId), [projectId]);
  const { data: project } = useFetch(() => api.projects.get(projectId), [projectId]);

  const [factor, setFactor] = useState<ScenarioChangeFactor>('TEAM_SIZE');
  const [taskId, setTaskId] = useState('');
  const [riskId, setRiskId] = useState('');
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const needsTask = factor === 'TASK_DURATION';
  const needsRisk = factor === 'RISK_PROBABILITY' || factor === 'RISK_IMPACT';
  const isRating = needsRisk;

  // แสดง "ค่าปัจจุบัน" ให้ดูเท่านั้น (อ่านจาก Backend) — ผู้ใช้กรอกแค่ค่าใหม่ ไม่ต้องกรอกค่าเดิม
  let current = '';
  if (factor === 'TEAM_SIZE' && project) current = `${project.teamSize} คน`;
  if (factor === 'BUDGET' && project) current = formatBaht(project.budget);
  if (factor === 'TASK_DURATION' && taskId) current = `${tasks?.find((t) => t.id === taskId)?.duration ?? '-'} วัน`;
  if (factor === 'RISK_PROBABILITY' && riskId) current = String(risks?.find((r) => r.id === riskId)?.probability ?? '-');
  if (factor === 'RISK_IMPACT' && riskId) current = String(risks?.find((r) => r.id === riskId)?.impact ?? '-');

  async function submit(ev: FormEvent) {
    ev.preventDefault();
    if (saving) return;
    const n = Number(value);
    if (value === '' || Number.isNaN(n)) return setError('กรุณากรอกค่าใหม่เป็นตัวเลข');
    if (needsTask && !taskId) return setError('กรุณาเลือกงาน');
    if (needsRisk && !riskId) return setError('กรุณาเลือกความเสี่ยง');
    if (factor === 'BUDGET' && n < 0) return setError('งบประมาณต้องไม่ติดลบ');
    if ((factor === 'TEAM_SIZE' || factor === 'TASK_DURATION') && (!Number.isInteger(n) || n < 1)) return setError('ต้องเป็นจำนวนเต็มตั้งแต่ 1 ขึ้นไป');
    if (isRating && (!Number.isInteger(n) || n < 1 || n > 5)) return setError('ต้องเป็นจำนวนเต็ม 1 ถึง 5');
    setError('');
    setSaving(true);
    try {
      await api.changes.create(scenario.id, {
        factor, newValue: n,
        taskId: needsTask ? taskId : undefined,
        riskId: needsRisk ? riskId : undefined,
      });
      toast('success', 'เพิ่มการเปลี่ยนแปลงแล้ว');
      setValue('');
      onAdded();
    } catch (e) {
      toast('error', e instanceof ApiError ? e.message : 'เพิ่มไม่สำเร็จ');
    } finally { setSaving(false); }
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-x-4 md:grid-cols-2">
      <Field label="ปัจจัยที่ต้องการเปลี่ยน" htmlFor="c-factor">
        <Select id="c-factor" value={factor} onChange={(e) => { setFactor(e.target.value as ScenarioChangeFactor); setTaskId(''); setRiskId(''); setValue(''); setError(''); }}>
          {FACTORS.map((f) => <option key={f} value={f}>{FACTOR_LABEL[f]}</option>)}
        </Select>
      </Field>
      {needsTask && (
        <Field label="งาน" htmlFor="c-task">
          <Select id="c-task" value={taskId} onChange={(e) => setTaskId(e.target.value)}>
            <option value="">-- เลือกงาน --</option>
            {tasks?.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </Select>
        </Field>
      )}
      {needsRisk && (
        <Field label="ความเสี่ยง" htmlFor="c-risk">
          <Select id="c-risk" value={riskId} onChange={(e) => setRiskId(e.target.value)}>
            <option value="">-- เลือกความเสี่ยง --</option>
            {risks?.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </Select>
        </Field>
      )}
      <Field label="ค่าใหม่" htmlFor="c-value" error={error} hint={current ? `ค่าปัจจุบัน: ${current}` : undefined}>
        <TextInput id="c-value" type="number" step={factor === 'BUDGET' ? '0.01' : 1} value={value} onChange={(e) => setValue(e.target.value)} />
      </Field>
      <div className="flex items-end pb-4"><Button type="submit" loading={saving}>+ เพิ่มการเปลี่ยนแปลง</Button></div>
    </form>
  );
}

export default function ScenarioPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const { data: scenario, error, loading, reload } = useFetch(() => api.scenarios.get(id), [id]);
  const { data: tasks } = useFetch(() => api.tasks.list(scenario?.projectId ?? ''), [scenario?.projectId]);
  const { data: risks } = useFetch(() => api.risks.list(scenario?.projectId ?? ''), [scenario?.projectId]);
  const history = useFetch(() => api.simulations.listForScenario(id), [id]);
  const [running, setRunning] = useState(false);
  const [removing, setRemoving] = useState<ScenarioChange | null>(null);
  const [busy, setBusy] = useState(false);

  function describe(c: ScenarioChange): string {
    const label = FACTOR_LABEL[c.factor];
    if (c.factor === 'TASK_DURATION') return `${label}: งาน "${tasks?.find((t) => t.id === c.taskId)?.name ?? '(ถูกลบแล้ว)'}" → ${formatNumber(c.newValue)} วัน`;
    if (c.factor === 'RISK_PROBABILITY' || c.factor === 'RISK_IMPACT') return `${label}: "${risks?.find((r) => r.id === c.riskId)?.name ?? '(ถูกลบแล้ว)'}" → ${c.newValue}`;
    if (c.factor === 'BUDGET') return `${label}: → ${formatBaht(c.newValue)}`;
    return `${label}: → ${formatNumber(c.newValue)}`;
  }

  async function run() {
    if (running) return;
    setRunning(true);
    try {
      // การคำนวณทั้งหมดอยู่ที่ Backend — Frontend แค่เรียกและแสดงผล
      const sim = await api.simulations.run(id);
      toast('success', 'จำลองสถานการณ์สำเร็จ');
      router.push(`/simulations/${sim.id}`);
    } catch (e) {
      toast('error', e instanceof ApiError ? e.message : 'จำลองไม่สำเร็จ');
      setRunning(false);
    }
  }

  async function confirmRemove() {
    if (!removing || busy) return;
    setBusy(true);
    try { await api.changes.remove(removing.id); toast('success', 'ลบการเปลี่ยนแปลงแล้ว'); setRemoving(null); reload(); }
    catch (e) { toast('error', e instanceof ApiError ? e.message : 'ลบไม่สำเร็จ'); }
    finally { setBusy(false); }
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!scenario) return null;
  const changes = scenario.changes ?? [];

  return (
    <>
      <Link href={`/projects/${scenario.projectId}`} className="focus-ring mb-2 inline-block rounded text-label-md text-primary-container hover:underline">← กลับไปโครงการ</Link>
      <PageHeader title={scenario.name} description={scenario.description ?? 'สถานการณ์จำลอง What-if'}
        actions={<Button onClick={run} loading={running} disabled={changes.length === 0}>▶ จำลองสถานการณ์</Button>} />

      <Card className="mb-6">
        <h2 className="mb-3 font-display text-headline-md">การเปลี่ยนแปลงในสถานการณ์นี้</h2>
        {changes.length === 0 ? (
          <EmptyState title="ยังไม่มีการเปลี่ยนแปลง" description="เพิ่มอย่างน้อย 1 การเปลี่ยนแปลงด้านล่างก่อนจึงจะจำลองได้" />
        ) : (
          <ul className="divide-y divide-outline-variant">
            {changes.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-2 py-2">
                <span className="text-body-md">{describe(c)}</span>
                <Button variant="ghost" className="text-error" onClick={() => setRemoving(c)}>ลบ</Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="mb-6">
        <h2 className="mb-3 font-display text-headline-md">เพิ่มการเปลี่ยนแปลง</h2>
        <p className="mb-4 text-caption text-on-surface-variant">กรอกเฉพาะค่าใหม่ — ระบบอ่านค่าปัจจุบันจากโครงการจริงเอง</p>
        <AddChangeForm scenario={scenario} onAdded={reload} />
      </Card>

      <Card>
        <h2 className="mb-3 font-display text-headline-md">ประวัติการจำลอง</h2>
        {history.loading && <LoadingState />}
        {history.error && <ErrorState error={history.error} onRetry={history.reload} />}
        {history.data && history.data.length === 0 && <EmptyState title="ยังไม่เคยจำลอง" />}
        {history.data && history.data.length > 0 && (
          <ul className="divide-y divide-outline-variant">
            {history.data.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className="text-body-md">{formatDateTime(s.executedAt)} · ระยะเวลา {s.beforeDuration} → {s.afterDuration} วัน</span>
                <Link href={`/simulations/${s.id}`} className="focus-ring rounded text-label-md text-primary-container hover:underline">ดูผล</Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <ConfirmDialog open={!!removing} title="ลบการเปลี่ยนแปลง" message="ต้องการลบการเปลี่ยนแปลงนี้ออกจากสถานการณ์ใช่หรือไม่?"
        loading={busy} onConfirm={confirmRemove} onCancel={() => setRemoving(null)} />
    </>
  );
}
