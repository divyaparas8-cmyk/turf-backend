const prisma = require('../src/config/prisma');

async function testBackendControllerLogic() {
  try {
    const paymentWhereAll = { status: 'COMPLETED' };
    const bookingWhereAll = { status: 'COMPLETED' };
    const matchPaymentWhereAll = { paymentStatus: 'COMPLETED' };

    const [allPayments, allBookings, allMatchPayments] = await Promise.all([
      prisma.payment.findMany({ where: paymentWhereAll, include: { booking: true } }),
      prisma.booking.findMany({ where: bookingWhereAll }),
      prisma.matchPayment.findMany({ where: matchPaymentWhereAll, include: { match: true } })
    ]);

    const allSlotIds = new Set();
    const allBookingIds = new Set();
    let grossTotalRevenue = 0;

    for (const p of allPayments) {
      if (p.bookingId) allBookingIds.add(p.bookingId);
      if (p.booking?.slotId) allSlotIds.add(p.booking.slotId);
      grossTotalRevenue += Number(p.amount || 0);
    }

    for (const mp of allMatchPayments) {
      if (mp.match?.slotId) allSlotIds.add(mp.match.slotId);
      grossTotalRevenue += Number(mp.amount || 0);
    }

    for (const b of allBookings) {
      if (allBookingIds.has(b.id)) continue;
      if (b.slotId && allSlotIds.has(b.slotId)) continue;
      allBookingIds.add(b.id);
      if (b.slotId) allSlotIds.add(b.slotId);
      grossTotalRevenue += Number(b.amount || 0);
    }

    console.log('Fixed grossTotalRevenue:', grossTotalRevenue);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

testBackendControllerLogic();
