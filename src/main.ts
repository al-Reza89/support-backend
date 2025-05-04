import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import * as session from 'express-session';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.setGlobalPrefix('api'); // Set the global API prefix

  // Add session middleware before other middleware
  app.use(
    session({
      secret: configService.get<string>('SESSION_SECRET'),
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: parseInt(process.env.REFRESH_TOKEN_AGE, 10),
        domain: process.env.COOKIE_DOMAIN,
        // if i set secure to true, its gives me an error on google auth callback route
        // secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      },
    }),
  );

  app.use(cookieParser());

  const allowedOrigins = configService
    .get<string>('ALLOWED_ORIGINS')
    .split(',');

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true); // Allow the request
      } else {
        callback(new Error('Not allowed by CORS')); // Block the request
      }
    },
    credentials: true, // Allow cookies/credentials
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], // Allowed methods
    allowedHeaders: ['Content-Type', 'Authorization'], // Allowed headers
  });
  app.useGlobalPipes(new ValidationPipe());
  await app.listen(process.env.PORT || 3000);
}
bootstrap();
