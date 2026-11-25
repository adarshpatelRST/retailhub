import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { TransferController } from './transfer.controller';
import { TransferService } from './transfer.service';

@Module({
  controllers: [InventoryController, TransferController],
  providers: [InventoryService, TransferService],
  exports: [InventoryService, TransferService],
})
export class InventoryModule {}
