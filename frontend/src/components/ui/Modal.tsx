'use client';
import { useEffect, useRef, type ReactNode } from 'react';
import { Button } from './Button';

export function Modal({ title, open, onClose, children }: { title: string; open: boolean; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>('input, select, textarea, button')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      // focus trap แบบง่าย: วน Tab อยู่ภายใน modal
      if (e.key === 'Tab' && ref.current) {
        const items = ref.current.querySelectorAll<HTMLElement>('input, select, textarea, button, [href]');
        if (items.length === 0) return;
        const first = items[0], last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); previous?.focus(); };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 md:items-center md:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label={title}
        className="max-h-[90vh] w-full overflow-y-auto rounded-t-xl bg-surface-container-lowest p-6 shadow-xl md:max-w-lg md:rounded-xl">
        <h2 className="mb-4 font-display text-headline-md text-on-surface">{title}</h2>
        {children}
      </div>
    </div>
  );
}

// ยืนยันก่อนลบ (บังคับตามมาตรฐาน: Delete Confirmation)
export function ConfirmDialog({ open, title, message, confirmLabel = 'ลบ', loading, onConfirm, onCancel }: {
  open: boolean; title: string; message: string; confirmLabel?: string; loading?: boolean; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <Modal title={title} open={open} onClose={onCancel}>
      <p className="mb-6 text-body-md text-on-surface-variant">{message}</p>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel} disabled={loading}>ยกเลิก</Button>
        <Button variant="danger" onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
      </div>
    </Modal>
  );
}
