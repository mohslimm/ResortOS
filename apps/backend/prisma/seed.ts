import 'dotenv/config';
import { PrismaClient, Role, RoomStatus, ParkingStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  console.log('🚀 Starting Seeding...');

  // 1. CLEANUP (Optional but useful for idempotent seed)
  // Warning: Be careful in production. This is for dev/test stabilization.
  await prisma.auditLog.deleteMany();
  await prisma.housekeepingTask.deleteMany();
  await prisma.parkingSession.deleteMany();
  await prisma.parkingSlot.deleteMany();
  await prisma.attendanceLog.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.guest.deleteMany();
  await prisma.room.deleteMany();
  await prisma.user.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.tenant.deleteMany();

  // 2. TENANTS
  const hotelA = await prisma.tenant.create({
    data: {
      name: 'Club Des Pins',
      slug: 'club-des-pins',
      subscription: {
        create: { plan: 'ENTERPRISE', status: 'ACTIVE' }
      }
    },
  });

  const hotelB = await prisma.tenant.create({
    data: {
      name: 'Sheraton',
      slug: 'sheraton',
      subscription: {
        create: { plan: 'PROFESSIONAL', status: 'TRIAL' }
      }
    },
  });

  // 3. USERS
  const passwordHash = await bcrypt.hash('admin123', 10);

  const adminA = await prisma.user.create({
    data: {
      tenantId: hotelA.id,
      email: 'admin@club.com',
      passwordHash,
      role: Role.ADMIN,
      name: 'Admin Club',
    },
  });

  const staffA = await prisma.user.create({
    data: {
      tenantId: hotelA.id,
      email: 'staff@club.com',
      passwordHash,
      role: Role.STAFF,
      name: 'Staff Club',
    },
  });

  await prisma.user.create({
    data: {
      tenantId: hotelB.id,
      email: 'admin@sheraton.com',
      passwordHash,
      role: Role.ADMIN,
      name: 'Admin Sheraton',
    },
  });

  // 4. PMS — ROOMS
  const room101 = await prisma.room.create({
    data: {
      tenantId: hotelA.id,
      number: '101',
      type: 'Suite Royale',
      floor: 1,
      pricePerNight: 450.00,
      status: RoomStatus.AVAILABLE,
    }
  });

  const room102 = await prisma.room.create({
    data: {
      tenantId: hotelA.id,
      number: '102',
      type: 'Double Vue Mer',
      floor: 1,
      pricePerNight: 280.00,
      status: RoomStatus.AVAILABLE,
    }
  });

  // 5. PARKING — SLOTS
  await prisma.parkingSlot.createMany({
    data: [
      { tenantId: hotelA.id, slotNumber: 'A-01', zone: 'VIP', status: ParkingStatus.FREE },
      { tenantId: hotelA.id, slotNumber: 'A-02', zone: 'VIP', status: ParkingStatus.FREE },
      { tenantId: hotelA.id, slotNumber: 'B-01', zone: 'GUEST', status: ParkingStatus.FREE },
    ]
  });

  // 6. HR — EMPLOYEES
  const empA = await prisma.employee.create({
    data: {
      tenantId: hotelA.id,
      name: 'Jean Nettoyeur',
      department: 'Housekeeping',
      position: 'Staff Senior',
    }
  });

  console.log('✅ Seeding Completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding Failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
