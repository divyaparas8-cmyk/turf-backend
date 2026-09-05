const prisma = require('../src/config/prisma');

async function findActiveUser() {
  const user = await prisma.user.findFirst({ where: { status: 'ACTIVE' } });
  console.log('Active User:', user.id, user.role);
}

findActiveUser().finally(() => prisma.$disconnect());
