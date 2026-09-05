const prisma = require('../src/config/prisma');

async function checkTodayBookings() {
  try {
    const today = new Date('2026-09-03T00:00:00.000Z');
    const bookings = await prisma.booking.findMany({
      where: {
        createdAt: { gte: today }
      }
    });

    const matchPayments = await prisma.matchPayment.findMany({
      where: {
        createdAt: { gte: today }
      },
      include: { match: true }
    });

    console.log('=== TODAY BOOKINGS ===');
    console.log(JSON.stringify(bookings, null, 2));

    console.log('=== TODAY MATCH PAYMENTS ===');
    console.log(JSON.stringify(matchPayments, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

checkTodayBookings();
