const prisma = require('../src/config/prisma');

async function testBranchQuery() {
  try {
    const ownerUser = await prisma.user.findFirst({ where: { role: 'OWNER' } });
    console.log('Testing for Owner User:', ownerUser?.id, ownerUser?.name);

    // Find branches for this owner
    const branches = await prisma.branch.findMany({
      where: {
        OR: [
          { ownerUserId: ownerUser.id },
          { owner: { userId: ownerUser.id } },
          { email: ownerUser.email }
        ]
      },
      select: { id: true, branchName: true }
    });

    console.log('Owner Branches:', branches);

    if (branches.length === 0) return;
    const branchIds = branches.map(b => b.id);

    // Query bookings by branch
    const bookings = await prisma.booking.findMany({
      where: {
        OR: [
          { slot: { branchId: { in: branchIds } } },
          { notes: { contains: branchIds[0] } }
        ]
      },
      include: {
        slot: true
      }
    });

    console.log(`Found ${bookings.length} bookings for owner branches:`);
    bookings.forEach(b => {
      console.log(`- ID: ${b.id} | Code: ${b.bookingCode} | Customer: ${b.customerName} | SlotBranch: ${b.slot?.branchId}`);
    });

  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

testBranchQuery();
