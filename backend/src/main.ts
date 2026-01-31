import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { CacheService } from './cache/cache.service';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Set global prefix for all routes
  app.setGlobalPrefix('api');

  // Enable CORS for frontend
  app.enableCors({
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
  });

  // Initialize cache service
  const cacheService = app.get(CacheService);
  try {
    await cacheService.connect();
    logger.log('Cache service connected');
  } catch (error) {
    logger.warn('Failed to connect to cache service', error);
  }

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  logger.log(`Application running on port ${port}`);
}

bootstrap().catch((error) => {
  console.error('Failed to start application', error);
  process.exit(1);
});
