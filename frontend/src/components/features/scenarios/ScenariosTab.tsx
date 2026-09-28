'use client';
import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field, TextArea, TextInput } from '@/components/ui/Field';
import { ConfirmDialog, Modal } from '@/components/ui/Modal';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { api, ApiError } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { useFetch } from '@/lib/useFetch';
import type { Scenario } from '@/types/api';

function ScenarioFormModal({ open, projectId, onClose, onSaved }: {
  open: boolean; projectId: string; onClose: () => void; onSaved: () => void;
}) {
  const toast = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [nameError, setNameError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(ev: FormEvent) {
    ev.preventDefault();
    if (saving) return;
    if (!name.trim()) { setNameError('กรุณากรอกชื่อสถานการณ์'); return; }
    setNameError('');
    setSaving(true);
    try {
      await api.scenarios.create(projectId, { name: name.trim(), description: description.trim() || undefined });
      toast('success', 'สร้างสถานการณ์จำลองแล้ว');
      onSaved();
      onClose();
    } catch (err) {
      toast('error', err instanceof ApiError ? err.message : 'สร้างไม่สำเร็จ');
    } finally { setSaving(false); }
  }

  return (
    <Modal title="สร้างสถานการณ์จำลอง" open={open} onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <Field label="ชื่อสถานการณ์" htmlFor="s-name" error={nameError} hint="เช่น ลดจำนวนคนในทีม">
          <TextInput id="s-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={200} />
        </Field>
        <Field label="รายละเอียด (ไม่บังคับ)" htmlFor="s-desc">
          <TextArea id="s-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>ยกเลิก</Button>
          <Button type="submit" loading={saving}>สร้าง</Button>
        </div>
      </form>
    </Modal>
  );
}

export function ScenariosTab({ projectId }: { projectId: string }) {
  const toast = useToast();
  const { data, error, loading, reload } = useFetch(() => api.scenarios.list(projectId), [projectId]);
  const [formOpen, setFormOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [deleting, setDeleting] = useState<Scenario | null>(null);
  const [busy, setBusy] = useState(false);

  async function confirmDelete() {
    if (!deleting || busy) return;
    setBusy(true);
    try { await api.scenarios.remove(deleting.id); toast('success', 'ลบสถานการณ์แล้ว'); setDeleting(null); reload(); }
    catch (e) { toast('error', e instanceof ApiError ? e.message : 'ลบไม่สำเร็จ'); }
    finally { setBusy(false); }
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const openForm = () => { setFormKey((k) => k + 1); setFormOpen(true); };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-body-md text-on-surface-variant">{data?.length ?? 0} สถานการณ์จำลอง</p>
        <Button onClick={openForm}>+ สร้างสถานการณ์</Button>
      </div>
      {data && data.length === 0 ? (
        <Card><EmptyState title="ยังไม่มีสถานการณ์จำลอง" description="สร้างสถานการณ์เพื่อดูว่าถ้าโครงการเปลี่ยนไป ระยะเวลา งบประมาณ และความเสี่ยงจะเป็นอย่างไร"
          action={<Button onClick={openForm}>+ สร้างสถานการณ์</Button>} /></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data?.map((s) => (
            <Card key={s.id} className="flex flex-col gap-2">
              <Link href={`/scenarios/${s.id}`} className="focus-ring rounded font-display text-headline-md text-primary-container hover:underline">{s.name}</Link>
              {s.description && <p className="text-body-md text-on-surface-variant">{s.description}</p>}
              <p className="text-caption text-on-surface-variant">สร้างเมื่อ {formatDateTime(s.createdAt)}</p>
              <div className="mt-auto flex gap-2 pt-2">
                <Link href={`/scenarios/${s.id}`} className="focus-ring inline-flex min-h-10 items-center rounded-lg px-4 text-label-md text-primary-container hover:bg-surface-container-low">จัดการ / จำลอง</Link>
                <Button variant="ghost" className="text-error" onClick={() => setDeleting(s)}>ลบ</Button>
              </div>
            </Card>
          ))}
        </div>
      )}
      <ScenarioFormModal key={formKey} open={formOpen} projectId={projectId} onClose={() => setFormOpen(false)} onSaved={reload} />
      <ConfirmDialog open={!!deleting} title="ลบสถานการณ์จำลอง"
        message={`ต้องการลบ "${deleting?.name}" ใช่หรือไม่? การเปลี่ยนแปลงและผลการจำลองของสถานการณ์นี้จะถูกลบด้วย`}
        loading={busy} onConfirm={confirmDelete} onCancel={() => setDeleting(null)} />
    </div>
  );
}
