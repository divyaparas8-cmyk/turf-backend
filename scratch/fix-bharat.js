const prisma = require('../src/config/prisma');

async function fixBharatData() {
  try {
    const id = 'br_1788429432426_14520'; // Bharat BR-8281

    // 1. Update amenities
    await prisma.branch.update({
      where: { id },
      data: {
        amenities: ['Floodlights', 'Parking']
      }
    });

    // 2. Sync branchSports to ONLY Cricket
    const masterCricket = await prisma.sport.findFirst({ where: { name: { contains: 'Cricket' } } });
    if (masterCricket) {
      await prisma.branchSport.deleteMany({
        where: { branchId: id, sportId: { not: masterCricket.id } }
      });
    }

    const updated = await prisma.branch.findUnique({
      where: { id },
      include: { branchSports: { include: { sport: true } } }
    });

    console.log('=== BHARAT AFTER EDIT ===');
    console.log('Amenities:', updated.amenities);
    console.log('Sports:', updated.branchSports.map(bs => bs.sport?.name || bs.name));

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

fixBharatData();
