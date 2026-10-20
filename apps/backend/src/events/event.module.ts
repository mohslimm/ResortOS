import { Global, Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { EventProducerService } from './event-producer.service';

@Global()
@Module({
  imports: [
    EventEmitterModule.forRoot({
      // Wildcards for flexible listening
      wildcard: true,
      delimiter: '.',
      verboseMemoryLeak: true,
    }),
  ],
  providers: [EventProducerService],
  exports: [EventProducerService],
})
export class EventModule {}
