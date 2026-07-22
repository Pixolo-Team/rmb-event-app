import "dotenv/config";
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { ValidationPipe } from "@nestjs/common";
import cookieParser from "cookie-parser";
import { csrfCookieMiddleware } from "./common/csrf/csrf-cookie.middleware";
import fs from "fs";
import path from "path";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const uploadsRoot = path.join(process.cwd(), "uploads");
  try {
    fs.mkdirSync(path.join(uploadsRoot, "photos"), { recursive: true });
    fs.mkdirSync(path.join(uploadsRoot, "avatars"), { recursive: true });
  } catch (error) {
    // A read-only filesystem must not crash boot. Uploads then need object
    // storage or a mounted writable volume (see docs/DEPLOYMENT.md).
    // eslint-disable-next-line no-console
    console.warn(
      `[api] could not create uploads dir at ${uploadsRoot} (read-only filesystem?): ${error}`,
    );
  }
  app.useStaticAssets(uploadsRoot, { prefix: "/uploads" });

  app.use(cookieParser());
  app.use(csrfCookieMiddleware);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  const webOrigin = process.env.WEB_ORIGIN;
  if (!webOrigin && process.env.NODE_ENV === "production") {
    throw new Error("WEB_ORIGIN must be set in production");
  }
  app.enableCors({
    origin: webOrigin ?? "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "X-CSRF-Token"],
  });

  const port = Number(process.env.PORT) ?? 4000;
  await app.listen(port, "0.0.0.0");
  // eslint-disable-next-line no-console
  console.log(`[api] listening on http://localhost:${port}`);
}

bootstrap();
