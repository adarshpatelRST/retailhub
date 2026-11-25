import { Module } from '@nestjs/common';
import { SalesModule } from '@/modules/sales/sales.module';
import { InventoryModule } from '@/modules/inventory/inventory.module';
import { IntelligenceModule } from '@/modules/intelligence';
import { SimulationController } from './simulation.controller';
import { SimulationService } from './simulation.service';
import { MasterDataSeeder } from './seeds/master-data.seeder';
import { GoldenPathSeeder } from './seeds/golden-path.seeder';
import { SeederService } from './seeds/seeder.service';

@Module({
  imports: [SalesModule, InventoryModule, IntelligenceModule],
  controllers: [SimulationController],
  providers: [
    SimulationService,
    MasterDataSeeder,
    GoldenPathSeeder,
    SeederService,
  ],
  exports: [SimulationService, SeederService],
})
export class SimulationModule {}
