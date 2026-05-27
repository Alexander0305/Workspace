import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error'], // Minimal logging to reduce memory overhead
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db