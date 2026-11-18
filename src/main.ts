import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { setupApp } from './app.setup';
import { EnvironmentVariables } from './config/environment-variables';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  setupApp(app);

  const config =
    app.get<ConfigService<EnvironmentVariables, true>>(ConfigService);
  await app.listen(config.get('PORT', { infer: true }));
}
void bootstrap();
