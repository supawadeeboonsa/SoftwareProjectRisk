import type { ReactNode } from 'react';
import type { ApiError } from '@/lib/api';
import { Button } from './Button';

export function LoadingState({ label = 'กำลังโหลดข้อมูล...' }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="flex items-center justify-center gap-3 py-12 text-on-surface-variant">
      <span aria-hidden className="h-5 w-5 animate-spin rounded-full border-2 border-primary-container border-t-transparent" />
      {label}
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 py-12 text-center">
      <p className="font-display text-headline-md text-on-surface">{title}</p>
      {description && <p className="max-w-md text-body-md text-on-surface-variant">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: ApiError; onRetry?: () => void }) {
  const notFound = error.status === 404;
  return (
    <div role="alert" className="flex flex-col items-center gap-2 py-12 text-center">
      <p className="font-display text-headline-md text-error">{notFound ? 'ไม่พบข้อมูล' : 'เกิดข้อผิดพลาด'}</p>
      <p className="max-w-md text-body-md text-on-surface-variant">{error.message}</p>
      {onRetry && !notFound && <Button variant="secondary" onClick={onRetry} className="mt-2">ลองใหม่</Button>}
    </div>
  );
}
