import { create } from 'zustand';
import { apiFetch } from '@/lib/api';
import type { AsyncState } from '@/types';

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  position: string;
  department: string;
  isActive: boolean;
}

export interface Attendance {
  id: string;
  employeeId: string;
  date: string;
  checkIn: string;
  checkOut: string | null;
  employee: Employee;
}

interface HrState {
  employeesState: AsyncState<Employee[]>;
  attendanceState: AsyncState<Attendance[]>;
  fetchEmployees: () => Promise<void>;
  fetchAttendance: () => Promise<void>;
  checkIn: (employeeId: string) => Promise<void>;
  checkOut: (logId: string) => Promise<void>;
}

export const useHrStore = create<HrState>((set, get) => ({
  employeesState: { status: 'idle' },
  attendanceState: { status: 'idle' },

  fetchEmployees: async () => {
    set({ employeesState: { status: 'loading' } });
    try {
      const data = await apiFetch<Employee[]>('/hr/employees');
      if (data.length === 0) {
        set({ employeesState: { status: 'empty', cta: 'Aucun employé trouvé.' } });
      } else {
        set({ employeesState: { status: 'success', data } });
      }
    } catch (err: any) {
      set({ employeesState: { status: 'error', error: err.message, retry: get().fetchEmployees } });
    }
  },

  fetchAttendance: async () => {
    set({ attendanceState: { status: 'loading' } });
    try {
      const data = await apiFetch<Attendance[]>('/hr/attendance');
      if (data.length === 0) {
        set({ attendanceState: { status: 'empty', cta: 'Aucun pointage aujourd\'hui.' } });
      } else {
        set({ attendanceState: { status: 'success', data } });
      }
    } catch (err: any) {
      set({ attendanceState: { status: 'error', error: err.message, retry: get().fetchAttendance } });
    }
  },

  checkIn: async (employeeId: string) => {
    try {
      await apiFetch(`/hr/attendance/check-in/${employeeId}`, { method: 'POST' });
      await get().fetchAttendance();
    } catch (err: any) {
      console.error(err);
      alert(`Erreur: ${err.message}`);
    }
  },

  checkOut: async (logId: string) => {
    try {
      await apiFetch(`/hr/attendance/check-out/${logId}`, { method: 'PATCH' });
      await get().fetchAttendance();
    } catch (err: any) {
      console.error(err);
      alert(`Erreur: ${err.message}`);
    }
  }
}));
