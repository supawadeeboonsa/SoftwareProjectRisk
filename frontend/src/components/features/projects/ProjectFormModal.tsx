'use client';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Field, Select, TextArea, TextInput } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { api, ApiError } from '@/lib/api';
import { toDateInput } from '@/lib/format';
import { PROJECT_STATUSES, PROJECT_STATUS_LABEL } from '@/lib/labels';
import type { Project, ProjectStatus } from '@/types/api';

// key ใช้ reset state ทุกครั้งที่เปิดฟอร์ม (ดู caller)
export function ProjectFormModal({ open, project, onClose, onSaved }: {
  open: boolean; project?: Project; onClose: () => void; onSaved: () => void;
}) {
  const toast = useToast();
  const [name, setName] = useState(project?.name ?? '');
  const [description, setDescription] = useState(project?.description ?? '');
  const [startDate, setStartDate] = useState(project ? toDateInput(project.startDate) : '');
  const [endDate, setEndDate] = useState(project ? toDateInput(project.endDate) : '');
  const [budget, setBudget] = useState(project ? String(project.budget) : '');
  const [teamSize, setTeamSize] = useState(project ? String(project.teamSize) : '');
  const [status, setStatus] = useState<ProjectStatus>(project?.status ?? 'PLANNING');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // ตรวจเบื้องต้นให้ผู้ใช้เห็นเร็ว — Backend ยังเป็น Source of Truth และตรวจซ้ำเสมอ
  function validate() {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'กรุณากรอกชื่อโครงการ';
    if (!startDate) e.startDate = 'กรุณาเลือกวันเริ่มต้น';
    if (!endDate) e.endDate = 'กรุณาเลือกวันสิ้นสุด';
    if (startDate && endDate && startDate > endDate) e.endDate = 'วันสิ้นสุดต้องไม่ก่อนวันเริ่มต้น';
    if (budget === '' || Number(budget) < 0) e.budget = 'งบประมาณต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป';
    if (!Number.isInteger(Number(teamSize)) || Number(teamSize) < 1) e.teamSize = 'จำนวนคนต้องเป็นจำนวนเต็มตั้งแต่ 1 ขึ้นไป';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit(ev: FormEvent) {
    ev.preventDefault();
    if (saving || !validate()) return;
    setSaving(true);
    const body = {
      name: name.trim(), description: description.trim() || undefined,
      startDate, endDate, budget: Number(budget), teamSize: Number(teamSize), status,
    };
    try {
      if (project) await api.projects.update(project.id, body);
      else await api.projects.create(body);
      toast('success', project ? 'บันทึกการแก้ไขแล้ว' : 'สร้างโครงการแล้ว');
      onSaved();
      onClose();
    } catch (e) {
      toast('error', e instanceof ApiError ? e.message : 'บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={project ? 'แก้ไขโครงการ' : 'สร้างโครงการใหม่'} open={open} onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <Field label="ชื่อโครงการ" htmlFor="p-name" error={errors.name}>
          <TextInput id="p-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={200} />
        </Field>
        <Field label="รายละเอียด (ไม่บังคับ)" htmlFor="p-desc">
          <TextArea id="p-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <div className="grid gap-x-4 md:grid-cols-2">
          <Field label="วันเริ่มต้น" htmlFor="p-start" error={errors.startDate}>
            <TextInput id="p-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </Field>
          <Field label="วันสิ้นสุด" htmlFor="p-end" error={errors.endDate}>
            <TextInput id="p-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </Field>
          <Field label="งบประมาณ (บาท)" htmlFor="p-budget" error={errors.budget}>
            <TextInput id="p-budget" type="number" min={0} step="0.01" value={budget} onChange={(e) => setBudget(e.target.value)} />
          </Field>
          <Field label="จำนวนคนในทีม" htmlFor="p-team" error={errors.teamSize}>
            <TextInput id="p-team" type="number" min={1} step={1} value={teamSize} onChange={(e) => setTeamSize(e.target.value)} />
          </Field>
        </div>
        <Field label="สถานะ" htmlFor="p-status">
          <Select id="p-status" value={status} onChange={(e) => setStatus(e.target.value as ProjectStatus)}>
            {PROJECT_STATUSES.map((s) => <option key={s} value={s}>{PROJECT_STATUS_LABEL[s]}</option>)}
          </Select>
        </Field>
        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>ยกเลิก</Button>
          <Button type="submit" loading={saving}>บันทึก</Button>
        </div>
      </form>
    </Modal>
  );
}
