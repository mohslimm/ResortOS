import { create } from 'zustand';
import { apiFetch } from '@/lib/api';
import type { AsyncState } from '@/types';

export interface ParkingSlot {
  id: string;
  slotNumber: string;
  zone: string;
  status: 'FREE' | 'OCCUPIED' | 'MAINTENANCE';
}

export interface ParkingSession {
  id: string;
  licensePlate: string;
  slotId: string;
  entryTime: string;
  exitTime: string | null;
  fee: number | null;
  status: 'ACTIVE' | 'COMPLETED';
  slot: ParkingSlot;
}

interface ParkingState {
  slotsState: AsyncState<ParkingSlot[]>;
  sessionsState: AsyncState<ParkingSession[]>;
  fetchSlots: () => Promise<void>;
  fetchSessions: () => Promise<void>;
  enterParking: (licensePlate: string, zone?: string) => Promise<void>;
  exitParking: (licensePlate: string) => Promise<void>;
}

export const useParkingStore = create<ParkingState>((set, get) => ({
  slotsState: { status: 'idle' },
  sessionsState: { status: 'idle' },

  fetchSlots: async () => {
    set({ slotsState: { status: 'loading' } });
    try {
      const data = await apiFetch<ParkingSlot[]>('/parking/slots');
      if (data.length === 0) {
        set({ slotsState: { status: 'empty', cta: 'Aucune place configurée.' } });
      } else {
        set({ slotsState: { status: 'success', data } });
      }
    } catch (err: any) {
      set({ slotsState: { status: 'error', error: err.message, retry: get().fetchSlots } });
    }
  },

  fetchSessions: async () => {
    set({ sessionsState: { status: 'loading' } });
    try {
      const data = await apiFetch<ParkingSession[]>('/parking/sessions');
      if (data.length === 0) {
        set({ sessionsState: { status: 'empty', cta: 'Aucune session active.' } });
      } else {
        set({ sessionsState: { status: 'success', data } });
      }
    } catch (err: any) {
      set({ sessionsState: { status: 'error', error: err.message, retry: get().fetchSessions } });
    }
  },

  enterParking: async (licensePlate: string, zone?: string) => {
    try {
      await apiFetch('/parking/enter', {
        method: 'POST',
        body: JSON.stringify({ licensePlate, zone }),
      });
      await Promise.all([get().fetchSlots(), get().fetchSessions()]);
    } catch (err: any) {
      console.error(err);
      alert(`Erreur: ${err.message}`);
    }
  },

  exitParking: async (licensePlate: string) => {
    try {
      const result: any = await apiFetch('/parking/exit', {
        method: 'POST',
        body: JSON.stringify({ licensePlate }),
      });
      alert(`Sortie enregistrée. Frais: ${result.fee} MAD`);
      await Promise.all([get().fetchSlots(), get().fetchSessions()]);
    } catch (err: any) {
      console.error(err);
      alert(`Erreur: ${err.message}`);
    }
  }
}));
