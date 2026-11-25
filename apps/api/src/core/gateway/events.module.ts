import { Global, Module } from '@nestjs/common';
import { CoreModule } from '../core.module';
import { EventsGateway } from './events.gateway';

@Global()
@Module({
  imports: [CoreModule],
  providers: [EventsGateway],
  exports: [EventsGateway],
})
export class EventsModule {}
