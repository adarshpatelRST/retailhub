import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from '@/app.module';
import { SeederService } from './seeder.service';

async function bootstrapSeedRunner(): Promise<void> {
  const logger = new Logger('SeedRunnerCLI');
  const cleanReset = process.argv.includes('--clean-reset') || process.argv.includes('--clean');

  logger.log(
    `Bootstrapping RetailHub NestJS Application Context for CLI Seeding (cleanReset=${cleanReset})...`,
  );

  const appContext = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'warn', 'error'],
  });

  try {
    const seederService = appContext.get(SeederService);
    const summary = await seederService.seedDemo({ cleanReset });
    logger.log(`Seed Result: ${summary.message}`);
  } catch (error) {
    logger.error(
      `Seed execution failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exitCode = 1;
  } finally {
    await appContext.close();
  }
}

void bootstrapSeedRunner();
