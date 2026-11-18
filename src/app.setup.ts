import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

/** Shared by `main.ts` and the e2e tests so both run the same pipeline. */
export function setupApp(app: INestApplication): void {
  app.useGlobalPipes(
    new ValidationPipe({
      // Fields that are not declared in a DTO never reach a service.
      whitelist: true,
      // Turns plain bodies and query strings into DTO instances.
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Cinema Booking API')
    .setDescription('Films, halls, showings and seat bookings of a cinema')
    .setVersion('1.0')
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, documentFactory);
}
