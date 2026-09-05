const prisma = require('../src/config/prisma');

async function inspectBookingsAndMatches() {
  try {
    console.log('=== ALL BOOKINGS IN PRISMA.BOOKING ===');
    const bookings = await prisma.booking.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    console.log(bookings.map(b => ({
      id: b.id,
      bookingId: b.bookingId,
      customerName: b.customerName,
      status: b.status,
      totalAmount: b.totalAmount,
      bookingDate: b.bookingDate,
      timeSlot: b.timeSlot
    })));

    console.log('\n=== ALL MATCHES IN PRISMA.MATCH ===');
    const matches = await prisma.match.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        matchTeams: true,
        captainA: true
      }
    });
    console.log(matches.map(m => ({
      id: m.id,
      captainName: m.captainA?.name || m.matchTeams?.[0]?.captainName,
      status: m.matchStatus,
      totalAmount: m.totalAmount,
      slotId: m.slotId
    })));

  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

inspectBookingsAndMatches();
