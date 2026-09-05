const prisma = require('../src/config/prisma');

async function inspectRelations() {
  try {
    const bookings = await prisma.booking.findMany({
      where: { id: { in: [9, 10, 11, 12] } }
    });
    const matchPayments = await prisma.matchPayment.findMany({
      where: { id: { in: ['mpay_shrikant_101', 'mpay_1788327628114_97698', 'mpay_1788329642168_99073'] } },
      include: { match: true }
    });

    console.log('=== BOOKINGS ===');
    console.log(JSON.stringify(bookings, null, 2));

    console.log('=== MATCH PAYMENTS ===');
    console.log(JSON.stringify(matchPayments, null, 2));

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

inspectRelations();
