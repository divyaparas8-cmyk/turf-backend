const prisma = require('../src/config/prisma');

async function testUpdateBranch() {
  try {
    const id = 'br_1788333231048_74705'; // Prashant_turf
    const selectedSportNames = ['Cricket'];
    const selectedAmenities = ['Floodlights', 'Parking'];

    // 1. Update Branch
    await prisma.branch.update({
      where: { id },
      data: {
        amenities: selectedAmenities
      }
    });

    // 2. Sync branchSports
    const allMasters = await prisma.sport.findMany();
    const selectedMasters = allMasters.filter(m => selectedSportNames.some(sn => sn.toLowerCase() === m.name.toLowerCase()));
    const selectedIds = selectedMasters.map(m => m.id);

    if (selectedIds.length > 0) {
      await prisma.branchSport.deleteMany({
        where: { branchId: id, sportId: { notIn: selectedIds } }
      });
    }

    // 3. Re-read
    const updated = await prisma.branch.findUnique({
      where: { id },
      include: { branchSports: { include: { sport: true } } }
    });

    console.log('=== AFTER EDIT & SAVE ===');
    console.log('Saved Amenities:', updated.amenities);
    console.log('Saved Sports:', updated.branchSports.map(bs => bs.sport?.name || bs.name));

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

testUpdateBranch();
