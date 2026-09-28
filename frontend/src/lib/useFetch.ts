'use client';
import { useCallback, useEffect, useState } from 'react';
import { ApiError } from './api';

// Hook อ่านข้อมูลแบบง่าย: loading / error / data / reload
export function useFetch<T>(loader: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await loader());
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError(0, 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ'));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => { void load(); }, [load]);

  return { data, error, loading, reload: load };
}
