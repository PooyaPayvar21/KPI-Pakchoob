import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./modules/app.module";
import * as dotenv from "dotenv";

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors({
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-CSRFToken",
      "X-User-Type",
      "X-User-Role",
      "X-User-Phase",
      "X-User-Section",
    ],
    exposedHeaders: ["Authorization"],
    optionsSuccessStatus: 200,
  });

  // Enable global validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    })
  );

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Server started on http://localhost:${port}`);
}
bootstrap();
