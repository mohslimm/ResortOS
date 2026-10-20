import { create } from 'zustand';
import { apiFetch } from '@/lib/api';
import type { AsyncState } from '@/types';
import type { Room } from './usePmsStore';

export interface HousekeepingTask {
  id: string;
  roomId: string;
  assignedToId: string | null;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'PENDING' | 'IN_PROGRESS' | 'DONE';
  notes: string | null;
  createdAt: string;
  room: Room;
}

interface HousekeepingState {
  tasksState: AsyncState<HousekeepingTask[]>;
  fetchTasks: () => Promise<void>;
  updateStatus: (taskId: string, status: 'PENDING' | 'IN_PROGRESS' | 'DONE') => Promise<void>;
}

export const useHousekeepingStore = create<HousekeepingState>((set, get) => ({
  tasksState: { status: 'idle' },

  fetchTasks: async () => {
    set({ tasksState: { status: 'loading' } });
    try {
      const data = await apiFetch<HousekeepingTask[]>('/housekeeping');
      if (data.length === 0) {
        set({ tasksState: { status: 'empty', cta: 'Aucune tâche de ménage en cours.' } });
      } else {
        set({ tasksState: { status: 'success', data } });
      }
    } catch (err: any) {
      set({ tasksState: { status: 'error', error: err.message, retry: get().fetchTasks } });
    }
  },

  updateStatus: async (taskId: string, status: string) => {
    try {
      await apiFetch(`/housekeeping/${taskId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      await get().fetchTasks();
    } catch (err: any) {
      console.error(err);
      alert(`Erreur: ${err.message}`);
    }
  }
}));
