'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { RiskLevelBadge } from '@/components/ui/Badge';
import { Card, PageHeader } from '@/components/ui/Card';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { api } from '@/lib/api';
import { formatBaht, formatDateTime, formatNumber, formatSigned } from '@/lib/format';
import { useFetch } from '@/lib/useFetch';

// แสดงผลจาก Backend ตรงๆ — ห้ามคำนวณซ้ำที่ Frontend
// หมายเหตุ: Backend ไม่มี GET /simulations/:id/analysis ผลวิเคราะห์ (impactSummary,
// recommendation) ส่งมาพร้อม GET /simulations/:id จึงแสดงรวมในหน้านี้
export default function SimulationPage() {
  const { id } = useParams<{ id: string }>();
  const { data: sim, error, loading, reload } = useFetch(() => api.simulations.get(id), [id]);
  const scenario = useFetch(() => (sim ? api.scenarios.get(sim.scenarioId) : Promise.resolve(null)), [sim?.scenarioId]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!sim) return null;

  const rows = [
    { label: 'ระยะเวลาโครงการ (Critical Path)', before: `${formatNumber(sim.beforeDuration)} วัน`, after: `${formatNumber(sim.afterDuration)} วัน`, change: formatSigned(sim.durationChange, 'วัน'), bad: sim.durationChange > 0 },
    { label: 'งบประมาณ', before: formatBaht(sim.beforeBudget), after: formatBaht(sim.afterBudget),
      change: `${formatSigned(sim.budgetChange, 'บาท')}${sim.budgetChangePercent === null ? ' (ไม่มีเปอร์เซ็นต์ เพราะงบเดิมเป็น 0)' : ` (${formatSigned(Math.round(sim.budgetChangePercent * 100) / 100)}%)`}`, bad: false },
    { label: 'จำนวนคนในทีม', before: `${sim.beforeTeamSize} คน`, after: `${sim.afterTeamSize} คน`, change: formatSigned(sim.afterTeamSize - sim.beforeTeamSize, 'คน'), bad: false },
  ];

  return (
    <>
      <Link href={`/scenarios/${sim.scenarioId}`} className="focus-ring mb-2 inline-block rounded text-label-md text-primary-container hover:underline">← กลับไปสถานการณ์จำลอง</Link>
      <PageHeader title="ผลการจำลองสถานการณ์" description={scenario.data ? `สถานการณ์: ${scenario.data.name}` : undefined} />

      <Card className="mb-6">
        <h2 className="mb-3 font-display text-headline-md">ก่อน / หลัง / การเปลี่ยนแปลง</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[32rem] text-left text-body-md">
            <thead>
              <tr className="border-b border-outline-variant text-label-md text-on-surface-variant">
                <th scope="col" className="py-2 pr-4">ตัวชี้วัด</th><th scope="col" className="py-2 pr-4">ก่อน</th>
                <th scope="col" className="py-2 pr-4">หลัง</th><th scope="col" className="py-2">เปลี่ยนแปลง</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label} className="border-b border-outline-variant last:border-0">
                  <th scope="row" className="py-3 pr-4 font-semibold">{r.label}</th>
                  <td className="py-3 pr-4">{r.before}</td><td className="py-3 pr-4">{r.after}</td>
                  <td className={`py-3 font-semibold ${r.bad ? 'text-error' : ''}`}>{r.change}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="mb-6">
        <h2 className="mb-3 font-display text-headline-md">ความเสี่ยงที่ถูกกระทบ</h2>
        {sim.riskChanges.length === 0 ? (
          <p className="text-body-md text-on-surface-variant">สถานการณ์นี้ไม่ได้เปลี่ยนความเสี่ยงใดๆ</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-left text-body-md">
              <thead>
                <tr className="border-b border-outline-variant text-label-md text-on-surface-variant">
                  <th scope="col" className="py-2 pr-4">ความเสี่ยง</th><th scope="col" className="py-2 pr-4">ก่อน (โอกาส × ผลกระทบ)</th>
                  <th scope="col" className="py-2 pr-4">หลัง (โอกาส × ผลกระทบ)</th><th scope="col" className="py-2">เปลี่ยนแปลง</th>
                </tr>
              </thead>
              <tbody>
                {sim.riskChanges.map((r) => (
                  <tr key={r.riskId} className="border-b border-outline-variant last:border-0">
                    <th scope="row" className="py-3 pr-4 font-semibold">{r.name}</th>
                    <td className="py-3 pr-4"><div>{r.beforeProbability} × {r.beforeImpact} = {r.beforeScore}</div><RiskLevelBadge level={r.beforeLevel} /></td>
                    <td className="py-3 pr-4"><div>{r.afterProbability} × {r.afterImpact} = {r.afterScore}</div><RiskLevelBadge level={r.afterLevel} /></td>
                    <td className={`py-3 font-semibold ${r.afterScore > r.beforeScore ? 'text-error' : ''}`}>{formatSigned(r.afterScore - r.beforeScore, 'คะแนน')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="mb-6 grid gap-6 md:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-display text-headline-md">สรุปผลกระทบ</h2>
          <ul className="list-disc space-y-1 pl-5 text-body-md">{sim.impactSummary.map((t, i) => <li key={i}>{t}</li>)}</ul>
        </Card>
        <Card>
          <h2 className="mb-3 font-display text-headline-md">ข้อเสนอแนะ</h2>
          {sim.recommendation.length === 0
            ? <p className="text-body-md text-on-surface-variant">ไม่มีข้อเสนอแนะเพิ่มเติมสำหรับผลลัพธ์นี้</p>
            : <ul className="list-disc space-y-1 pl-5 text-body-md">{sim.recommendation.map((t, i) => <li key={i}>{t}</li>)}</ul>}
          <p className="mt-3 text-caption text-on-surface-variant">ระบบช่วยประกอบการตัดสินใจเท่านั้น ผู้ใช้เป็นผู้ตัดสินใจ</p>
        </Card>
      </div>

      <p className="text-caption text-on-surface-variant">สูตรเวอร์ชัน {sim.formulaVersion} · คำนวณเมื่อ {formatDateTime(sim.executedAt)}</p>
    </>
  );
}
