const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

prisma.$use(async (params, next) => {
  let retries = 2;
  while (retries > 0) {
    try {
      return await next(params);
    } catch (error) {
      retries--;
      const isConnectionClosed =
        error.code === 'P1017' ||
        error.code === 'P1001' ||
        error.code === 'P1002' ||
        (error.message && error.message.includes('closed the connection')) ||
        (error.message && error.message.includes('Connection loss'));

      if (isConnectionClosed && retries > 0) {
        console.warn(`[Prisma DB Warning] Connection lost during ${params.model || 'query'}.${params.action || 'execute'}. Reconnecting to MySQL database...`);
        try {
          await prisma.$disconnect();
        } catch (_) {}
        await prisma.$connect();
        continue;
      }
      throw error;
    }
  }
});

module.exports = prisma;

