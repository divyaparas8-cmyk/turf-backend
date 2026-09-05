const prisma = require('../src/config/prisma');

async function cleanupBharatName() {
  try {
    await prisma.branch.update({
      where: { id: 'br_1788429432426_14520' },
      data: { branchName: 'Bharat' }
    });
    console.log('Reset Bharat branch name to "Bharat"');
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupBharatName();
