import { create } from 'zustand';

export interface TenantMetrics {
  occupancyRate: number;
  activeGuests: number;
  roomStatus: Record<string, number>;
  housekeepingWorkload: number;
  parkingOccupancy: {
    total: number;
    occupied: number;
    rate: number;
  };
  todayAttendance: number;
}

interface AnalyticsState {
  metrics: TenantMetrics | null;
  loading: boolean;
  error: string | null;
  setMetrics: (metrics: TenantMetrics) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useAnalyticsStore = create<AnalyticsState>((set) => ({
  metrics: null,
  loading: true,
  error: null,
  setMetrics: (metrics) => set({ metrics, loading: false, error: null }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error, loading: false }),
}));
