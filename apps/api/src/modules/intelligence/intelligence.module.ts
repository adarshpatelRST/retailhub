import { Module } from '@nestjs/common';
import { InventoryModule } from '@/modules/inventory/inventory.module';
import { SalesModule } from '@/modules/sales/sales.module';
import { IntelligenceController } from './intelligence.controller';
import { DoiService } from './services/doi.service';
import { CandidateRankingService } from './services/candidate-ranking.service';
import { RebalanceService } from './services/rebalance.service';

@Module({
  imports: [InventoryModule, SalesModule],
  controllers: [IntelligenceController],
  providers: [DoiService, CandidateRankingService, RebalanceService],
  exports: [DoiService, CandidateRankingService, RebalanceService],
})
export class IntelligenceModule {}
