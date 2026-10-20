/**
 * Base structure for all system events.
 * Designed to be compatible with future Kafka/RabbitMQ migration.
 */
export interface ResortEvent<T = any> {
  eventId: string; // UUID
  tenantId: string; // Target tenant
  type: string; // e.g., 'booking.created'
  source: string; // e.g., 'pms.bookings'
  timestamp: number; // Epoch ms
  payload: T; // Event data
}

/**
 * Event Types Registry
 */
export const EVENT_TYPES = {
  // AUTH
  AUTH_LOGIN_SUCCESS: 'auth.login_success',
  AUTH_LOGIN_FAILED: 'auth.login_failed',

  // PMS
  BOOKING_CREATED: 'booking.created',
  BOOKING_CHECKED_IN: 'booking.checked_in',
  BOOKING_CHECKED_OUT: 'booking.checked_out',
  ROOM_STATUS_CHANGED: 'room.status_changed',

  // HOUSEKEEPING
  HOUSEKEEPING_TASK_CREATED: 'housekeeping.task_created',
  HOUSEKEEPING_TASK_COMPLETED: 'housekeeping.task_completed',

  // PARKING
  PARKING_VEHICLE_ENTERED: 'parking.vehicle_entered',
  PARKING_VEHICLE_EXITED: 'parking.vehicle_exited',

  // HR
  EMPLOYEE_ATTENDANCE_LOGGED: 'employee.attendance_logged',
} as const;

export type EventType = (typeof EVENT_TYPES)[keyof typeof EVENT_TYPES];
