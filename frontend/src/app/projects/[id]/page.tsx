'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { ProjectFormModal } from '@/components/features/projects/ProjectFormModal';
import { RisksTab } from '@/components/features/risks/RisksTab';
import { ScenariosTab } from '@/components/features/scenarios/ScenariosTab';
import { TasksTab } from '@/components/features/tasks/TasksTab';
import { ProjectStatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, PageHeader } from '@/components/ui/Card';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { api } from '@/lib/api';
import { formatBaht, formatDate } from '@/lib/format';
import { useFetch } from '@/lib/useFetch';

const TABS = [
  { key: 'overview', label: 'ภาพรวม' },
  { key: 'tasks', label: 'งานและลำดับงาน' },
  { key: 'risks', label: 'ความเสี่ยง' },
  { key: 'scenarios', label: 'สถานการณ์จำลอง' },
] as const;
type TabKey = (typeof TABS)[number]['key'];

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: project, error, loading, reload } = useFetch(() => api.projects.get(id), [id]);
  const [tab, setTab] = useState<TabKey>('overview');
  const [editOpen, setEditOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!project) return null;

  return (
    <>
      <Link href="/projects" className="focus-ring mb-2 inline-block rounded text-label-md text-primary-container hover:underline">← กลับไปรายการโครงการ</Link>
      <PageHeader title={project.name} description={project.description ?? undefined}
        actions={<><ProjectStatusBadge status={project.status} />
          <Button variant="secondary" onClick={() => { setFormKey((k) => k + 1); setEditOpen(true); }}>แก้ไขโครงการ</Button></>} />

      <div role="tablist" aria-label="ส่วนของโครงการ" className="mb-6 flex gap-1 overflow-x-auto border-b border-outline-variant">
        {TABS.map((t) => (
          <button key={t.key} role="tab" type="button" id={`tab-${t.key}`} aria-selected={tab === t.key} aria-controls={`panel-${t.key}`}
            onClick={() => setTab(t.key)}
            className={`focus-ring whitespace-nowrap px-4 py-2 text-label-md ${tab === t.key ? 'border-b-2 border-primary-container font-bold text-primary-container' : 'text-on-surface-variant hover:text-on-surface'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === 'overview' && (
          <Card>
            <dl className="grid gap-4 md:grid-cols-2">
              <div><dt className="text-label-md text-on-surface-variant">งบประมาณ</dt><dd className="text-body-lg">{formatBaht(project.budget)}</dd></div>
              <div><dt className="text-label-md text-on-surface-variant">จำนวนคนในทีม</dt><dd className="text-body-lg">{project.teamSize} คน</dd></div>
              <div><dt className="text-label-md text-on-surface-variant">วันเริ่มต้น (แผน)</dt><dd className="text-body-lg">{formatDate(project.startDate)}</dd></div>
              <div><dt className="text-label-md text-on-surface-variant">วันสิ้นสุด (แผน)</dt><dd className="text-body-lg">{formatDate(project.endDate)}</dd></div>
            </dl>
            <p className="mt-4 text-caption text-on-surface-variant">
              วันที่ข้างต้นเป็นแผนงาน ส่วนระยะเวลาที่คำนวณจริงจากลำดับงานจะแสดงในผลการจำลองสถานการณ์
            </p>
          </Card>
        )}
        {tab === 'tasks' && <TasksTab projectId={id} />}
        {tab === 'risks' && <RisksTab projectId={id} />}
        {tab === 'scenarios' && <ScenariosTab projectId={id} />}
      </div>

      <ProjectFormModal key={formKey} open={editOpen} project={project} onClose={() => setEditOpen(false)} onSaved={reload} />
    </>
  );
}
