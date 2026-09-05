const prisma = require('../src/config/prisma');

async function checkBookingAndMatch() {
  try {
    const bookings = await prisma.booking.findMany({
      where: {
        OR: [
          { customerName: { contains: 'aman' } },
          { bookingCode: { contains: '1788427' } }
        ]
      }
    });

    const matchPayments = await prisma.matchPayment.findMany({
      where: {
        OR: [
          { playerName: { contains: 'Vikram' } },
          { matchId: { contains: '1788' } }
        ]
      },
      include: { match: true }
    });

    const matches = await prisma.match.findMany({
      where: {
        createdAt: { gte: new Date('2026-09-01') }
      }
    });

    console.log('=== BOOKINGS ===');
    console.log(JSON.stringify(bookings, null, 2));

    console.log('=== MATCH PAYMENTS ===');
    console.log(JSON.stringify(matchPayments, null, 2));

    console.log('=== MATCHES ===');
    console.log(JSON.stringify(matches, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

checkBookingAndMatch();
