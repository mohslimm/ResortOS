import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';

export function setupApp(app: INestApplication) {
  app.setGlobalPrefix('api/v1');
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
}

export async function getAccessToken(
  app: INestApplication,
  email: string,
  password = 'password123',
): Promise<string> {
  const response = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ email, password });

  if (response.status !== 200) {
    throw new Error(`Failed to login: ${JSON.stringify(response.body)}`);
  }

  return response.body.access_token;
}

export const TEST_TENANTS = {
  A: {
    email: 'admin@club.com',
    password: 'admin123',
  },
  B: {
    email: 'admin@sheraton.com',
    password: 'admin123',
  },
};
