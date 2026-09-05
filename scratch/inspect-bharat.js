const prisma = require('../src/config/prisma');

async function inspectBharatBranch() {
  try {
    const bharat = await prisma.branch.findFirst({
      where: {
        OR: [
          { branchName: { contains: 'Bharat' } },
          { branchCode: { contains: '8281' } }
        ]
      },
      include: {
        branchSports: { include: { sport: true } },
        owner: true
      }
    });

    console.log('=== BHARAT BRANCH IN DATABASE ===');
    console.log(JSON.stringify(bharat, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

inspectBharatBranch();
