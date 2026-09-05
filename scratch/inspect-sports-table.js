const prisma = require('../src/config/prisma');

async function inspectSportsTable() {
  try {
    const sports = await prisma.sport.findMany({});
    console.log('=== SPORTS IN DATABASE ===');
    console.log(sports);
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

inspectSportsTable();
