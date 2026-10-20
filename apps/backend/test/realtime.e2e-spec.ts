import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { io, Socket } from 'socket.io-client';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma.service';
import { setupApp, TEST_TENANTS } from './e2e-helpers';

describe('Realtime & Events (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tokenA: string;
  let tokenB: string;
  let tenantAId: string;
  let tenantBId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    setupApp(app);
    await app.init();
    await app.listen(0); // Listen on random port for WS testing

    prisma = app.get<PrismaService>(PrismaService);

    // Get Tenant A (Club Des Pins)
    const loginA = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: TEST_TENANTS.A.email, password: TEST_TENANTS.A.password });

    if (loginA.status !== 200) {
      console.error('Login A failed:', loginA.body);
    }
    expect(loginA.status).toBe(200);
    tokenA = loginA.body.access_token;
    tenantAId = loginA.body.user.tenantId;

    // Get Tenant B (Sheraton)
    const loginB = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: TEST_TENANTS.B.email, password: TEST_TENANTS.B.password });

    if (loginB.status !== 200) {
      console.error('Login B failed:', loginB.body);
    }
    expect(loginB.status).toBe(200);
    tokenB = loginB.body.access_token;
    tenantBId = loginB.body.user.tenantId;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  it('SHOULD receive live metrics update on Tenant A when a booking is created', (done) => {
    const port = app.getHttpServer().address().port;
    const clientA = io(`http://localhost:${port}/realtime`, {
      auth: { token: tokenA },
    });

    clientA.on('connected', async () => {
      // Find a real room for Tenant A
      const room = await prisma.room.findFirst({
        where: { tenantId: tenantAId },
      });

      // Trigger action for Tenant A
      await request(app.getHttpServer())
        .post('/api/v1/pms/bookings')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-tenant-id', tenantAId)
        .send({
          roomId: room!.id,
          guestFullName: 'Realtime Guest',
          guestIdCard: 'RT-123',
          guestPhone: '0550112233',
          checkIn: new Date().toISOString(),
          checkOut: new Date(Date.now() + 86400000).toISOString(),
        });
    });

    clientA.on('metrics_update', (data) => {
      expect(data).toBeDefined();
      expect(data.occupancyRate).toBeDefined();
      clientA.disconnect();
      done();
    });
  }, 10000);

  it('SHOULD NOT leak Tenant A updates to Tenant B client', (done) => {
    const port = app.getHttpServer().address().port;
    const clientB = io(`http://localhost:${port}/realtime`, {
      auth: { token: tokenB },
    });

    let receivedTenantAUpdate = false;

    clientB.on('metrics_update', (data) => {
      // If we receive an update while Tenant A is acting, it might be a leak
      // (unless Tenant B also has activity, which it doesn't here)
      receivedTenantAUpdate = true;
    });

    // Connect Client A and trigger action
    const clientA = io(`http://localhost:${port}/realtime`, {
      auth: { token: tokenA },
    });

    clientA.on('connected', async () => {
      // Find a real room for Tenant A
      const room = await prisma.room.findFirst({
        where: { tenantId: tenantAId },
      });

      await request(app.getHttpServer())
        .post('/api/v1/pms/bookings')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-tenant-id', tenantAId)
        .send({
          roomId: room!.id,
          guestFullName: 'Isolation Test',
          guestIdCard: 'ISO-999',
          guestPhone: '0550112233',
          checkIn: new Date().toISOString(),
          checkOut: new Date(Date.now() + 86400000).toISOString(),
        });

      // Wait a bit to ensure B didn't get it
      setTimeout(() => {
        expect(receivedTenantAUpdate).toBe(false);
        clientA.disconnect();
        clientB.disconnect();
        done();
      }, 1500);
    });
  }, 10000);
});
