import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { getAccessToken, TEST_TENANTS } from './e2e-helpers';
import cookieParser from 'cookie-parser';

describe('Authentication & Isolation (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Login Flow', () => {
    it('should login successfully with valid credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: TEST_TENANTS.A.email,
          password: 'admin123',
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('access_token');
      expect(res.header['set-cookie']).toBeDefined();
    });

    it('should fail with invalid credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: TEST_TENANTS.A.email,
          password: 'wrongpassword',
        });

      expect(res.status).toBe(401);
    });
  });

  describe('Tenant Isolation Attack', () => {
    let tokenB: string;
    let tenantA_Id: string;
    let tenantB_Id: string;

    beforeAll(async () => {
      // Login as Tenant B
      tokenB = await getAccessToken(app, TEST_TENANTS.B.email);

      // Get Tenant IDs
      const resA = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: TEST_TENANTS.A.email, password: 'admin123' });
      tenantA_Id = resA.body.user.tenantId;

      const resB = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: TEST_TENANTS.B.email, password: 'admin123' });
      tenantB_Id = resB.body.user.tenantId;
    });

    it('Tenant B should access their own rooms', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/pms/rooms')
        .set('Authorization', `Bearer ${tokenB}`)
        .set('x-tenant-id', tenantB_Id);

      expect(res.status).toBe(200);
      // All rooms returned must belong to Tenant B
      res.body.forEach((room: any) => {
        expect(room.tenantId).toBe(tenantB_Id);
      });
    });

    it('CRITICAL: Tenant B SHOULD NOT access Tenant A rooms by spoofing x-tenant-id header', async () => {
      // Tenant B tries to spoof Tenant A ID in header while using B's token
      const res = await request(app.getHttpServer())
        .get('/api/v1/pms/rooms')
        .set('Authorization', `Bearer ${tokenB}`)
        .set('x-tenant-id', tenantA_Id);

      // If isolation is strong, this should fail or return EMPTY list, but never Tenant A data
      // Expectation: 403 Forbidden or 401 Unauthorized because of tenant mismatch
      expect(res.status).toBe(403);
    });
  });
});
