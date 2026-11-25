import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ScheduleModule } from '@nestjs/schedule';
import { CoreModule } from './core/core.module';
import { EventsModule } from './core/gateway/events.module';
import { ProductModule } from './modules/product/product.module';
import { StoreModule } from './modules/store/store.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { SalesModule } from './modules/sales/sales.module';
import { SimulationModule } from './modules/simulation/simulation.module';
import { IntelligenceModule } from './modules/intelligence/intelligence.module';
import { AiModule } from './modules/ai/ai.module';
import { ActionCenterModule } from './modules/action-center/action-center.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';

/**
 * Root Application Module for the RetailHub Modular Monolith (`apps/api`).
 * Registers:
 * - `@nestjs/cache-manager` `CacheModule.register({ isGlobal: true, ttl: 60000 })` for sub-20ms executive dashboard caching
 * - `@nestjs/schedule` `ScheduleModule.forRoot()` for 06:00 AM daily rebalance cron jobs
 * - Chunk B1: `CoreModule` (PrismaService, Global Filters, Interceptors, RBAC/DataScope Guards)
 * - Chunk B2: `ProductModule` & `StoreModule` (Master Catalog, Barcode-First Search, Store Network, Regions)
 * - Chunk B3: `InventoryModule` (Inventory Balances, Optimistic Locking, SCD Type 2 Rules, 3-Step Stock Transfers)
 * - Chunk B4: `SalesModule` & `SimulationModule` (POS Receipt Ingestion, Velocity Engine, Synthetic Sales Spikes & 50-Store Seeder)
 * - Chunk B5: `IntelligenceModule` (Deterministic DOI Math, Regional Candidate Ranking, 7-Day Donor Safety Clamping, 14-Day Rebalance Orchestrator)
 * - Chunk B6: `AiModule` & `ActionCenterModule` (Vendor-Agnostic LangChain AI Service, Human-in-the-Loop Approvals, Modifications, Rejections & Manual Store Requests)
 * - Chunk B7: `EventsModule` (Socket.io Real-Time Gateway) & `DashboardModule` (Executive & Scoped Store Dashboards)
 */
@Module({
  imports: [
    CacheModule.register({
      isGlobal: true,
      ttl: 60000,
    }),
    ScheduleModule.forRoot(),
    CoreModule,
    EventsModule,
    ProductModule,
    StoreModule,
    InventoryModule,
    SalesModule,
    SimulationModule,
    IntelligenceModule,
    AiModule,
    ActionCenterModule,
    DashboardModule,
  ],
})
export class AppModule {}
