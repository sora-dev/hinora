import { config as loadEnv } from 'dotenv';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'node:path';
import { AppModule } from './app.module';

// Load .env for local dev. Hosted platforms (Railway) inject env vars directly.
loadEnv({ path: join(process.cwd(), '.env') });

function resolveCorsOrigins() {
  const fromEnv = process.env.CORS_ORIGINS ?? process.env.FRONTEND_ORIGIN ?? '';
  const origins = fromEnv
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  const defaults = ['http://localhost:3000'];
  return origins.length > 0 ? [...new Set([...defaults, ...origins])] : defaults;
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.set('trust proxy', 1);
  app.enableCors({
    origin: resolveCorsOrigins(),
    credentials: true,
  });
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });
  await app.listen(process.env.PORT ?? 3001);
}
void bootstrap();
