import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { getAccessToken, TEST_TENANTS } from './e2e-helpers';
import cookieParser from 'cookie-parser';

describe('PMS Lifecycle (e2e)', () => {
  let app: INestApplication;
  let tokenA: string;
  let tenantA_Id: string;

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

    // Login as Admin A
    tokenA = await getAccessToken(app, TEST_TENANTS.A.email);

    // Get Tenant ID A
    const resLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: TEST_TENANTS.A.email, password: 'admin123' });
    tenantA_Id = resLogin.body.user.tenantId;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Full Booking Workflow', () => {
    let roomId: string;
    let bookingId: string;

    it('should find an available room', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/pms/rooms')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-tenant-id', tenantA_Id);

      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);
      roomId = res.body[0].id;
    });

    it('should create a new booking', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dayAfter = new Date();
      dayAfter.setDate(dayAfter.getDate() + 2);

      const res = await request(app.getHttpServer())
        .post('/api/v1/pms/bookings')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-tenant-id', tenantA_Id)
        .send({
          roomId,
          guestFullName: 'E2E Guest',
          guestIdCard: 'E2E-ID-123',
          checkIn: tomorrow.toISOString(),
          checkOut: dayAfter.toISOString(),
          notes: 'Test E2E',
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('CONFIRMED');
      bookingId = res.body.id;
    });

    it('should perform check-in and update room status', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/pms/bookings/${bookingId}/check-in`)
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-tenant-id', tenantA_Id);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('CHECKED_IN');

      // Verify room status is now OCCUPIED
      const roomRes = await request(app.getHttpServer())
        .get(`/api/v1/pms/rooms/${roomId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-tenant-id', tenantA_Id);

      expect(roomRes.body.status).toBe('OCCUPIED');
    });

    it('should perform check-out and trigger housekeeping', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/pms/bookings/${bookingId}/check-out`)
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-tenant-id', tenantA_Id);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('CHECKED_OUT');

      // Verify room status is now CLEANING
      const roomRes = await request(app.getHttpServer())
        .get(`/api/v1/pms/rooms/${roomId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-tenant-id', tenantA_Id);

      expect(roomRes.body.status).toBe('CLEANING');
    });
  });
});
