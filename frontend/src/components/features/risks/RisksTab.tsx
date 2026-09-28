'use client';
import { useState, type FormEvent } from 'react';
import { RiskLevelBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field, Select, TextArea, TextInput } from '@/components/ui/Field';
import { ConfirmDialog, Modal } from '@/components/ui/Modal';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { api, ApiError } from '@/lib/api';
import { useFetch } from '@/lib/useFetch';
import type { Risk } from '@/types/api';

const RATINGS = [1, 2, 3, 4, 5];

function RiskFormModal({ open, projectId, risk, onClose, onSaved }: {
  open: boolean; projectId: string; risk?: Risk; onClose: () => void; onSaved: () => void;
}) {
  const toast = useToast();
  const [name, setName] = useState(risk?.name ?? '');
  const [description, setDescription] = useState(risk?.description ?? '');
  const [probability, setProbability] = useState(risk?.probability ?? 3);
  const [impact, setImpact] = useState(risk?.impact ?? 3);
  const [mitigation, setMitigation] = useState(risk?.mitigation ?? '');
  const [contingency, setContingency] = useState(risk?.contingency ?? '');
  const [owner, setOwner] = useState(risk?.owner ?? '');
  const [nameError, setNameError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(ev: FormEvent) {
    ev.preventDefault();
    if (saving) return;
    if (!name.trim()) { setNameError('กรุณากรอกชื่อความเสี่ยง'); return; }
    setNameError('');
    setSaving(true);
    // ไม่ส่ง score/level — Backend คำนวณเองเสมอ (และจะปฏิเสธถ้าส่งมา)
    const body = {
      name: name.trim(), description: description.trim() || undefined, probability, impact,
      mitigation: mitigation.trim() || undefined, contingency: contingency.trim() || undefined, owner: owner.trim() || undefined,
    };
    try {
      if (risk) await api.risks.update(risk.id, body);
      else await api.risks.create(projectId, body);
      toast('success', risk ? 'บันทึกความเสี่ยงแล้ว' : 'เพิ่มความเสี่ยงแล้ว');
      onSaved();
      onClose();
    } catch (err) {
      toast('error', err instanceof ApiError ? err.message : 'บันทึกไม่สำเร็จ');
    } finally { setSaving(false); }
  }

  return (
    <Modal title={risk ? 'แก้ไขความเสี่ยง' : 'เพิ่มความเสี่ยง'} open={open} onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <Field label="ชื่อความเสี่ยง" htmlFor="r-name" error={nameError}>
          <TextInput id="r-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={200} />
        </Field>
        <Field label="รายละเอียด (ไม่บังคับ)" htmlFor="r-desc">
          <TextArea id="r-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <div className="grid gap-x-4 md:grid-cols-2">
          <Field label="โอกาสเกิด (1-5)" htmlFor="r-prob">
            <Select id="r-prob" value={probability} onChange={(e) => setProbability(Number(e.target.value))}>
              {RATINGS.map((n) => <option key={n} value={n}>{n}</option>)}
            </Select>
          </Field>
          <Field label="ผลกระทบ (1-5)" htmlFor="r-impact">
            <Select id="r-impact" value={impact} onChange={(e) => setImpact(Number(e.target.value))}>
              {RATINGS.map((n) => <option key={n} value={n}>{n}</option>)}
            </Select>
          </Field>
        </div>
        <p className="mb-4 text-caption text-on-surface-variant">คะแนนและระดับความเสี่ยงจะถูกคำนวณโดยระบบหลังบันทึก</p>
        <Field label="แนวทางลดความเสี่ยง (ไม่บังคับ)" htmlFor="r-mit"><TextArea id="r-mit" value={mitigation} onChange={(e) => setMitigation(e.target.value)} /></Field>
        <Field label="แผนสำรอง (ไม่บังคับ)" htmlFor="r-con"><TextArea id="r-con" value={contingency} onChange={(e) => setContingency(e.target.value)} /></Field>
        <Field label="ผู้รับผิดชอบ (ไม่บังคับ)" htmlFor="r-owner"><TextInput id="r-owner" value={owner} onChange={(e) => setOwner(e.target.value)} maxLength={200} /></Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>ยกเลิก</Button>
          <Button type="submit" loading={saving}>บันทึก</Button>
        </div>
      </form>
    </Modal>
  );
}

export function RisksTab({ projectId }: { projectId: string }) {
  const toast = useToast();
  const { data, error, loading, reload } = useFetch(() => api.risks.list(projectId), [projectId]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Risk | undefined>();
  const [formKey, setFormKey] = useState(0);
  const [deleting, setDeleting] = useState<Risk | null>(null);
  const [busy, setBusy] = useState(false);

  function openForm(r?: Risk) { setEditing(r); setFormKey((k) => k + 1); setFormOpen(true); }

  async function confirmDelete() {
    if (!deleting || busy) return;
    setBusy(true);
    try { await api.risks.remove(deleting.id); toast('success', 'ลบความเสี่ยงแล้ว'); setDeleting(null); reload(); }
    catch (e) { toast('error', e instanceof ApiError ? e.message : 'ลบไม่สำเร็จ'); }
    finally { setBusy(false); }
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const sorted = [...(data ?? [])].sort((a, b) => b.score - a.score);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-body-md text-on-surface-variant">{sorted.length} ความเสี่ยง (เรียงตามคะแนนมากไปน้อย)</p>
        <Button onClick={() => openForm()}>+ เพิ่มความเสี่ยง</Button>
      </div>
      {sorted.length === 0 ? (
        <Card><EmptyState title="ยังไม่มีความเสี่ยง" description="ระบุความเสี่ยงของโครงการเพื่อใช้จำลองสถานการณ์"
          action={<Button onClick={() => openForm()}>+ เพิ่มความเสี่ยง</Button>} /></Card>
      ) : (
        <div className="flex flex-col gap-3">
          {sorted.map((r) => (
            <Card key={r.id}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-display text-headline-md">{r.name}</p>
                  {r.description && <p className="text-body-md text-on-surface-variant">{r.description}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <RiskLevelBadge level={r.level} />
                  <Button variant="secondary" onClick={() => openForm(r)}>แก้ไข</Button>
                  <Button variant="ghost" className="text-error" onClick={() => setDeleting(r)}>ลบ</Button>
                </div>
              </div>
              <p className="mt-2 text-label-md">
                โอกาสเกิด {r.probability} × ผลกระทบ {r.impact} = <strong>คะแนน {r.score}</strong>
              </p>
              <dl className="mt-2 grid gap-2 text-label-md md:grid-cols-3">
                <div><dt className="text-on-surface-variant">แนวทางลดความเสี่ยง</dt><dd>{r.mitigation || '-'}</dd></div>
                <div><dt className="text-on-surface-variant">แผนสำรอง</dt><dd>{r.contingency || '-'}</dd></div>
                <div><dt className="text-on-surface-variant">ผู้รับผิดชอบ</dt><dd>{r.owner || '-'}</dd></div>
              </dl>
            </Card>
          ))}
        </div>
      )}
      <RiskFormModal key={formKey} open={formOpen} projectId={projectId} risk={editing} onClose={() => setFormOpen(false)} onSaved={reload} />
      <ConfirmDialog open={!!deleting} title="ลบความเสี่ยง" message={`ต้องการลบ "${deleting?.name}" ใช่หรือไม่?`}
        loading={busy} onConfirm={confirmDelete} onCancel={() => setDeleting(null)} />
    </div>
  );
}
