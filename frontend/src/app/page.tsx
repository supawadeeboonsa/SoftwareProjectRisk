'use client';
import Link from 'next/link';
import { RiskLevelBadge } from '@/components/ui/Badge';
import { Card, PageHeader } from '@/components/ui/Card';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { RISK_LEVEL_LABEL } from '@/lib/labels';
import { useFetch } from '@/lib/useFetch';
import type { Project, Risk, RiskLevel, Simulation } from '@/types/api';

interface DashboardData {
  projects: Project[];
  risks: (Risk & { projectName: string })[];
  latestSimulation: (Simulation & { scenarioName: string; projectId: string; projectName: string }) | null;
}

// รวมข้อมูลจาก endpoint ที่มีอยู่จริงของ Backend (ยังไม่มี endpoint สรุป Dashboard โดยเฉพาะ)
async function loadDashboard(): Promise<DashboardData> {
  const projects = await api.projects.list();
  const perProject = await Promise.all(
    projects.map(async (p) => {
      const [risks, scenarios] = await Promise.all([api.risks.list(p.id), api.scenarios.list(p.id)]);
      const sims = (await Promise.all(scenarios.map(async (s) => (await api.simulations.listForScenario(s.id)).map((sim) => ({ sim, s })))) ).flat();
      return { p, risks, sims };
    }),
  );
  const risks = perProject.flatMap(({ p, risks }) => risks.map((r) => ({ ...r, projectName: p.name })));
  const allSims = perProject.flatMap(({ p, sims }) => sims.map(({ sim, s }) => ({ ...sim, scenarioName: s.name, projectId: p.id, projectName: p.name })));
  allSims.sort((a, b) => b.executedAt.localeCompare(a.executedAt));
  return { projects, risks, latestSimulation: allSims[0] ?? null };
}

const LEVELS: RiskLevel[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const BAR: Record<RiskLevel, string> = { LOW: 'bg-emerald-500', MEDIUM: 'bg-amber-500', HIGH: 'bg-orange-500', CRITICAL: 'bg-error' };

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <p className="text-label-md text-on-surface-variant">{label}</p>
      <p className="font-display text-display-lg text-on-surface">{value}</p>
    </Card>
  );
}

export default function DashboardPage() {
  const { data, error, loading, reload } = useFetch(loadDashboard);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!data) return null;

  const { projects, risks, latestSimulation } = data;
  if (projects.length === 0) {
    return (
      <>
        <PageHeader title="ภาพรวม" />
        <Card><EmptyState title="ยังไม่มีข้อมูล" description="เริ่มต้นด้วยการสร้างโครงการแรก"
          action={<Link href="/projects" className="btn-gradient focus-ring inline-flex min-h-10 items-center rounded-lg px-4 text-label-md text-on-primary">ไปที่โครงการ</Link>} /></Card>
      </>
    );
  }

  const count = (l: RiskLevel) => risks.filter((r) => r.level === l).length;
  const ranking = [...risks].sort((a, b) => b.score - a.score).slice(0, 5);
  // โครงการที่มีคะแนนความเสี่ยงรวมสูงสุด
  const totals = projects.map((p) => ({ p, total: risks.filter((r) => r.projectId === p.id).reduce((s, r) => s + r.score, 0) })).sort((a, b) => b.total - a.total);
  const highest = totals[0].total > 0 ? totals[0] : null;
  const recent = [...projects].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);
  const max = Math.max(1, ...LEVELS.map(count));

  return (
    <>
      <PageHeader title="ภาพรวม" description="สรุปโครงการและความเสี่ยงทั้งหมด" />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="โครงการทั้งหมด" value={projects.length} />
        <Stat label="ความเสี่ยงทั้งหมด" value={risks.length} />
        <Stat label="ความเสี่ยงระดับสูง" value={count('HIGH')} />
        <Stat label="ความเสี่ยงระดับวิกฤต" value={count('CRITICAL')} />
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-display text-headline-md">การกระจายระดับความเสี่ยง</h2>
          {risks.length === 0 ? <p className="text-body-md text-on-surface-variant">ยังไม่มีความเสี่ยง</p> : (
            <ul className="space-y-3">
              {LEVELS.map((l) => (
                <li key={l}>
                  <div className="mb-1 flex justify-between text-label-md"><span>{RISK_LEVEL_LABEL[l]} ({l})</span><span>{count(l)}</span></div>
                  <div className="h-3 rounded-full bg-surface-variant"><div className={`h-3 rounded-full ${BAR[l]}`} style={{ width: `${(count(l) / max) * 100}%` }} /></div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="mb-3 font-display text-headline-md">อันดับความเสี่ยงสูงสุด</h2>
          {ranking.length === 0 ? <p className="text-body-md text-on-surface-variant">ยังไม่มีความเสี่ยง</p> : (
            <ol className="space-y-2">
              {ranking.map((r, i) => (
                <li key={r.id} className="flex items-center justify-between gap-2">
                  <span className="min-w-0 text-body-md"><span className="text-on-surface-variant">{i + 1}.</span> {r.name}
                    <Link href={`/projects/${r.projectId}`} className="ml-1 text-caption text-primary-container hover:underline">({r.projectName})</Link></span>
                  <span className="flex shrink-0 items-center gap-2"><strong>{r.score}</strong><RiskLevelBadge level={r.level} /></span>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <h2 className="mb-3 font-display text-headline-md">โครงการล่าสุด</h2>
          <ul className="space-y-2">
            {recent.map((p) => (
              <li key={p.id}><Link href={`/projects/${p.id}`} className="focus-ring rounded text-body-md text-primary-container hover:underline">{p.name}</Link></li>
            ))}
          </ul>
        </Card>
        <Card>
          <h2 className="mb-3 font-display text-headline-md">โครงการเสี่ยงสูงสุด</h2>
          {highest ? (
            <><Link href={`/projects/${highest.p.id}`} className="focus-ring rounded text-body-md text-primary-container hover:underline">{highest.p.name}</Link>
              <p className="text-caption text-on-surface-variant">คะแนนความเสี่ยงรวม {highest.total}</p></>
          ) : <p className="text-body-md text-on-surface-variant">ยังไม่มีข้อมูลความเสี่ยง</p>}
        </Card>
        <Card>
          <h2 className="mb-3 font-display text-headline-md">การจำลองล่าสุด</h2>
          {latestSimulation ? (
            <>
              <p className="text-body-md">{latestSimulation.projectName} · {latestSimulation.scenarioName}</p>
              <p className="text-caption text-on-surface-variant">{formatDateTime(latestSimulation.executedAt)} · ระยะเวลา {latestSimulation.beforeDuration} → {latestSimulation.afterDuration} วัน</p>
              <Link href={`/simulations/${latestSimulation.id}`} className="focus-ring mt-2 inline-block rounded text-label-md text-primary-container hover:underline">ดูผล</Link>
            </>
          ) : <p className="text-body-md text-on-surface-variant">ยังไม่เคยจำลองสถานการณ์</p>}
        </Card>
      </div>
    </>
  );
}
