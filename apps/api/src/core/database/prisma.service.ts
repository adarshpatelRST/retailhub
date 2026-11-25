import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * PrismaService manages the Microsoft SQL Server connection pool lifecycle
 * with exponential backoff connection retry and graceful shutdown hooks.
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  private readonly maxRetries = 5;
  private readonly baseRetryDelayMs = 1500;

  constructor() {
    super({
      log:
        process.env.NODE_ENV === 'development'
          ? ['query', 'info', 'warn', 'error']
          : ['warn', 'error'],
      errorFormat: 'minimal',
    });
  }

  async onModuleInit(): Promise<void> {
    await this.connectWithRetry();
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Closing Microsoft SQL Server Prisma connection pool...');
    await this.$disconnect();
    this.logger.log('Microsoft SQL Server connection pool closed cleanly.');
  }

  private async connectWithRetry(): Promise<void> {
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        this.logger.log(
          `Connecting to Microsoft SQL Server (attempt ${attempt}/${this.maxRetries})...`,
        );
        await this.$connect();
        this.logger.log(
          'Successfully established connection to Microsoft SQL Server.',
        );
        return;
      } catch (error) {
        const errMessage =
          error instanceof Error ? error.message : String(error);
        this.logger.error(
          `Database connection attempt ${attempt}/${this.maxRetries} failed: ${errMessage}`,
        );

        if (attempt === this.maxRetries) {
          this.logger.error(
            'Exhausted all database connection retries. Failing startup.',
          );
          throw error;
        }

        const backoffMs = this.baseRetryDelayMs * Math.pow(2, attempt - 1);
        this.logger.warn(`Retrying connection in ${backoffMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }
  }

  /**
   * Executes a lightweight health ping (`SELECT 1`) against Microsoft SQL Server.
   */
  async isHealthy(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1 AS result`;
      return true;
    } catch (error) {
      this.logger.error(
        'MS SQL Server health ping failed',
        error instanceof Error ? error.stack : String(error),
      );
      return false;
    }
  }
}
