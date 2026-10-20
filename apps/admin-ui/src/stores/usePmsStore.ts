import { create } from 'zustand';
import { apiFetch } from '@/lib/api';
import type { AsyncState } from '@/types';

export interface Room {
  id: string;
  number: string;
  type: string;
  status: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE' | 'CLEANING';
  price?: number;
  pricePerNight?: number;
}

export interface Booking {
  id: string;
  guestId: string;
  roomId: string;
  checkIn: string;
  checkOut: string;
  status: 'PENDING' | 'CONFIRMED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'CANCELLED';
  room: Room;
  guest: {
    fullName: string;
    idCard: string;
    phone?: string;
  };
}

interface PmsState {
  roomsState: AsyncState<Room[]>;
  bookingsState: AsyncState<Booking[]>;
  fetchRooms: () => Promise<void>;
  fetchBookings: () => Promise<void>;
  checkIn: (bookingId: string) => Promise<void>;
  checkOut: (bookingId: string) => Promise<void>;
}

export const usePmsStore = create<PmsState>((set, get) => ({
  roomsState: { status: 'idle' },
  bookingsState: { status: 'idle' },

  fetchRooms: async () => {
    set({ roomsState: { status: 'loading' } });
    try {
      const data = await apiFetch<Room[]>('/pms/rooms');
      if (data.length === 0) {
        set({ roomsState: { status: 'empty', cta: 'Aucune chambre configurée.' } });
      } else {
        set({ roomsState: { status: 'success', data } });
      }
    } catch (err: any) {
      set({ 
        roomsState: { 
          status: 'error', 
          error: err.message, 
          retry: get().fetchRooms 
        } 
      });
    }
  },

  fetchBookings: async () => {
    set({ bookingsState: { status: 'loading' } });
    try {
      const data = await apiFetch<Booking[]>('/pms/bookings');
      if (data.length === 0) {
        set({ bookingsState: { status: 'empty', cta: 'Aucune réservation trouvée.' } });
      } else {
        set({ bookingsState: { status: 'success', data } });
      }
    } catch (err: any) {
      set({ 
        bookingsState: { 
          status: 'error', 
          error: err.message, 
          retry: get().fetchBookings 
        } 
      });
    }
  },

  checkIn: async (bookingId: string) => {
    try {
      await apiFetch(`/pms/bookings/${bookingId}/check-in`, { method: 'PATCH' });
      // Refresh both to get updated status
      await Promise.all([get().fetchBookings(), get().fetchRooms()]);
    } catch (err: any) {
      // In a real app, we might use a toast here
      console.error(err);
      alert(`Erreur: ${err.message}`);
    }
  },

  checkOut: async (bookingId: string) => {
    try {
      await apiFetch(`/pms/bookings/${bookingId}/check-out`, { method: 'PATCH' });
      // Refresh both to get updated status
      await Promise.all([get().fetchBookings(), get().fetchRooms()]);
    } catch (err: any) {
      console.error(err);
      alert(`Erreur: ${err.message}`);
    }
  }
}));
