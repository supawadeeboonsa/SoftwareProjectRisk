'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ProjectFormModal } from '@/components/features/projects/ProjectFormModal';
import { ProjectStatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, PageHeader } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/Modal';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { api, ApiError } from '@/lib/api';
import { formatBaht, formatDate } from '@/lib/format';
import { useFetch } from '@/lib/useFetch';
import type { Project } from '@/types/api';

export default function ProjectsPage() {
  const toast = useToast();
  const { data, error, loading, reload } = useFetch(() => api.projects.list());
  const [query, setQuery] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Project | undefined>();
  const [formKey, setFormKey] = useState(0);
  const [deleting, setDeleting] = useState<Project | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);

  const filtered = useMemo(
    () => (data ?? []).filter((p) => p.name.toLowerCase().includes(query.trim().toLowerCase())),
    [data, query],
  );

  function openForm(p?: Project) {
    setEditing(p);
    setFormKey((k) => k + 1);
    setFormOpen(true);
  }

  async function confirmDelete() {
    if (!deleting || deletingBusy) return;
    setDeletingBusy(true);
    try {
      await api.projects.remove(deleting.id);
      toast('success', 'ลบโครงการแล้ว');
      setDeleting(null);
      reload();
    } catch (e) {
      toast('error', e instanceof ApiError ? e.message : 'ลบไม่สำเร็จ');
    } finally {
      setDeletingBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="โครงการ" description="จัดการโครงการซอฟต์แวร์ทั้งหมด"
        actions={<Button onClick={() => openForm()}>+ สร้างโครงการ</Button>} />

      {loading && <LoadingState />}
      {error && <ErrorState error={error} onRetry={reload} />}

      {data && data.length === 0 && (
        <Card><EmptyState title="ยังไม่มีโครงการ" description="เริ่มต้นด้วยการสร้างโครงการแรกของคุณ"
          action={<Button onClick={() => openForm()}>+ สร้างโครงการ</Button>} /></Card>
      )}

      {data && data.length > 0 && (
        <>
          <div className="mb-4">
            <label htmlFor="search" className="sr-only">ค้นหาโครงการ</label>
            <input id="search" type="search" placeholder="ค้นหาชื่อโครงการ..." value={query} onChange={(e) => setQuery(e.target.value)}
              className="focus-ring w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 md:max-w-sm" />
          </div>
          {filtered.length === 0 ? (
            <Card><EmptyState title="ไม่พบโครงการที่ค้นหา" /></Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((p) => (
                <Card key={p.id} className="flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/projects/${p.id}`} className="focus-ring min-w-0 rounded font-display text-headline-md text-primary-container hover:underline">
                      {p.name}
                    </Link>
                    <ProjectStatusBadge status={p.status} />
                  </div>
                  {p.description && <p className="line-clamp-2 text-body-md text-on-surface-variant">{p.description}</p>}
                  <dl className="grid grid-cols-2 gap-2 text-label-md">
                    <div><dt className="text-on-surface-variant">งบประมาณ</dt><dd>{formatBaht(p.budget)}</dd></div>
                    <div><dt className="text-on-surface-variant">ทีม</dt><dd>{p.teamSize} คน</dd></div>
                    <div className="col-span-2"><dt className="text-on-surface-variant">ระยะเวลา</dt><dd>{formatDate(p.startDate)} - {formatDate(p.endDate)}</dd></div>
                  </dl>
                  <div className="mt-auto flex gap-2 pt-2">
                    <Link href={`/projects/${p.id}`} className="focus-ring inline-flex min-h-10 items-center rounded-lg px-4 text-label-md text-primary-container hover:bg-surface-container-low">ดูรายละเอียด</Link>
                    <Button variant="secondary" onClick={() => openForm(p)}>แก้ไข</Button>
                    <Button variant="ghost" className="text-error" onClick={() => setDeleting(p)}>ลบ</Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      <ProjectFormModal key={formKey} open={formOpen} project={editing} onClose={() => setFormOpen(false)} onSaved={reload} />
      <ConfirmDialog open={!!deleting} title="ลบโครงการ"
        message={`ต้องการลบ "${deleting?.name}" ใช่หรือไม่? งาน ความเสี่ยง และสถานการณ์จำลองทั้งหมดของโครงการนี้จะถูกลบไปด้วย และกู้คืนไม่ได้`}
        loading={deletingBusy} onConfirm={confirmDelete} onCancel={() => setDeleting(null)} />
    </>
  );
}
