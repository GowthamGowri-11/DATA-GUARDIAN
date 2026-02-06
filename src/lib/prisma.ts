import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Create new client only if one doesn't exist
function createPrismaClient(): PrismaClient {
  const client = new PrismaClient({
    // Minimal logging for performance - only errors
    log: ['error'],
  });

  return client;
}

// Use existing client or create new one
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

// Cache client in development to prevent hot-reload memory leaks
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
