const prisma = require('../src/config/prisma');

async function checkBranchDetails() {
  try {
    const branches = await prisma.branch.findMany({
      include: {
        branchSports: { include: { sport: true } }
      }
    });

    for (const b of branches) {
      console.log('Branch ID:', b.id, '| Name:', b.branchName);
      console.log('  b.amenities:', b.amenities);
      console.log('  b.branchSports:', b.branchSports.map(bs => bs.sport?.name || bs.name));
      console.log('-------------------------------------------');
    }
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

checkBranchDetails();
