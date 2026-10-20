import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { getAccessToken, TEST_TENANTS } from './e2e-helpers';
import cookieParser from 'cookie-parser';

describe('Housekeeping (e2e)', () => {
  let app: INestApplication;
  let tokenA: string;
  let tenantA_Id: string;
  let staffTokenA: string;
  let staffId: string;

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

    // Get Tenant ID and Staff Info
    const resLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: TEST_TENANTS.A.email, password: 'admin123' });
    tenantA_Id = resLogin.body.user.tenantId;

    // Login as Staff A (staff@club.com)
    const resStaff = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'staff@club.com', password: 'admin123' });
    staffTokenA = resStaff.body.access_token;
    staffId = resStaff.body.user.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Task Lifecycle', () => {
    let roomId: string;
    let taskId: string;

    it('should create a housekeeping task', async () => {
      // Find a room first
      const roomRes = await request(app.getHttpServer())
        .get('/api/v1/pms/rooms')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-tenant-id', tenantA_Id);
      roomId = roomRes.body[0].id;

      const res = await request(app.getHttpServer())
        .post('/api/v1/housekeeping')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-tenant-id', tenantA_Id)
        .send({
          roomId,
          priority: 3,
          notes: 'Urgent cleaning',
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('PENDING');
      taskId = res.body.id;
    });

    it('should assign task to staff', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/housekeeping/${taskId}/assign/${staffId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-tenant-id', tenantA_Id);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('IN_PROGRESS');
      expect(res.body.assignedToId).toBe(staffId);
    });

    it('should show task in staff "my-tasks"', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/housekeeping/my-tasks')
        .set('Authorization', `Bearer ${staffTokenA}`)
        .set('x-tenant-id', tenantA_Id);

      expect(res.status).toBe(200);
      expect(res.body.some((t: any) => t.id === taskId)).toBe(true);
    });

    it('should complete task and mark room as AVAILABLE', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/housekeeping/${taskId}/status`)
        .set('Authorization', `Bearer ${staffTokenA}`)
        .set('x-tenant-id', tenantA_Id)
        .send({
          status: 'DONE',
          notes: 'Room is perfect',
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('DONE');

      // Verify room status
      const roomRes = await request(app.getHttpServer())
        .get(`/api/v1/pms/rooms/${roomId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-tenant-id', tenantA_Id);

      expect(roomRes.body.status).toBe('AVAILABLE');
    });
  });
});
