import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { v4 as uuidv4 } from 'uuid';
import { ResortEvent, EventType } from './event.types';

@Injectable()
export class EventProducerService {
  private readonly logger = new Logger('EventProducer');

  constructor(private readonly eventEmitter: EventEmitter2) {}

  /**
   * Emits a system event.
   * Internal transport is currently EventEmitter2, abstraction allows easy swap to Kafka.
   */
  async emit<T>(
    type: EventType,
    tenantId: string,
    source: string,
    payload: T,
  ): Promise<void> {
    const event: ResortEvent<T> = {
      eventId: uuidv4(),
      tenantId,
      type,
      source,
      timestamp: Date.now(),
      payload,
    };

    // Emit internally
    this.eventEmitter.emit(type, event);

    // Logging for traceability (Quiet Luxury style)
    this.logger.debug(`[${type}] Event emitted for tenant ${tenantId}`);
  }
}
