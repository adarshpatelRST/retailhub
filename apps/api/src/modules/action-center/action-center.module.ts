import { Module } from '@nestjs/common';
import { IntelligenceModule } from '@/modules/intelligence';
import { SalesModule } from '@/modules/sales/sales.module';
import { AiModule } from '@/modules/ai/ai.module';
import { ActionCenterController } from './action-center.controller';
import { ActionCenterService } from './action-center.service';

@Module({
  imports: [IntelligenceModule, SalesModule, AiModule],
  controllers: [ActionCenterController],
  providers: [ActionCenterService],
  exports: [ActionCenterService],
})
export class ActionCenterModule {}
