// ─── Shared types between Backend, Admin UI, and AI service ──────

export type Role =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'DIRECTOR'
  | 'STAFF'
  | 'SECURITY'
  | 'HOUSEKEEPER';

export type RoomStatus = 'AVAILABLE' | 'OCCUPIED' | 'CLEANING' | 'MAINTENANCE';
export type BookingStatus = 'CONFIRMED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'CANCELLED' | 'NO_SHOW';
export type HousekeepingStatus = 'PENDING' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';
export type ParkingStatus = 'FREE' | 'OCCUPIED' | 'RESERVED';
export type SubscriptionPlan = 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';

export interface JwtUser {
  sub: string;
  tenantId: string;
  role: Role;
  email: string;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
