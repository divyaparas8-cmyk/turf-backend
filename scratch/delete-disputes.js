const prisma = require('../src/config/prisma');

async function deleteDisputes() {
  try {
    const countBefore = await prisma.dispute.count();
    console.log(`Disputes count before deletion: ${countBefore}`);

    const deleted = await prisma.dispute.deleteMany({});
    console.log(`Deleted ${deleted.count} dispute records.`);

    const countAfter = await prisma.dispute.count();
    console.log(`Disputes count after deletion: ${countAfter}`);
  } catch (e) {
    console.error('Error deleting disputes:', e);
  } finally {
    await prisma.$disconnect();
  }
}

deleteDisputes();
