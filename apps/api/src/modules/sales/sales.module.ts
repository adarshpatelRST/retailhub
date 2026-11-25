import { Module } from '@nestjs/common';
import { InventoryModule } from '@/modules/inventory/inventory.module';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';
import { VelocityService } from './velocity.service';

@Module({
  imports: [InventoryModule],
  controllers: [SalesController],
  providers: [SalesService, VelocityService],
  exports: [SalesService, VelocityService],
})
export class SalesModule {}
