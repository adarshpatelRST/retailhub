import { Module } from '@nestjs/common';
import { IntelligenceModule } from '@/modules/intelligence';
import { SalesModule } from '@/modules/sales/sales.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [IntelligenceModule, SalesModule],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
