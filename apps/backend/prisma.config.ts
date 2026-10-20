// prisma.config.ts — Prisma 7 configuration
// Connection URL lives here instead of in schema.prisma datasource block.
import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: './prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL!,
  },
  migrations: {
    seed: 'ts-node ./prisma/seed.ts',
  }
});
