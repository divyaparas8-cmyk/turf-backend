const prisma = require('../src/config/prisma');

async function testDeduplication() {
  try {
    const paymentWhereAll = { status: 'COMPLETED' };
    const bookingWhereAll = { status: 'COMPLETED' };
    const matchPaymentWhereAll = { paymentStatus: 'COMPLETED' };

    const [allPayments, allBookings, allMatchPayments] = await Promise.all([
      prisma.payment.findMany({ where: paymentWhereAll, include: { booking: true } }),
      prisma.booking.findMany({ where: bookingWhereAll }),
      prisma.matchPayment.findMany({ where: matchPaymentWhereAll, include: { match: true } })
    ]);

    const processedSlotIds = new Set();
    const processedBookingIds = new Set();
    let grossTotalRevenue = 0;
    let totalCount = 0;

    // 1. Payments
    for (const p of allPayments) {
      if (p.bookingId) processedBookingIds.add(p.bookingId);
      if (p.booking?.slotId) processedSlotIds.add(p.booking.slotId);
      grossTotalRevenue += Number(p.amount || 0);
      totalCount++;
    }

    // 2. Match Payments
    for (const mp of allMatchPayments) {
      const slotId = mp.match?.slotId;
      if (slotId) processedSlotIds.add(slotId);
      grossTotalRevenue += Number(mp.amount || 0);
      totalCount++;
    }

    // 3. Standalone Bookings (excluding bookings whose payment is already counted, OR whose slotId was counted in MatchPayment)
    for (const b of allBookings) {
      if (processedBookingIds.has(b.id)) continue;
      if (b.slotId && processedSlotIds.has(b.slotId)) continue;

      processedBookingIds.add(b.id);
      if (b.slotId) processedSlotIds.add(b.slotId);
      grossTotalRevenue += Number(b.amount || 0);
      totalCount++;
    }

    console.log('--- DEDUPLICATED TOTAL REVENUE ---');
    console.log('Gross Total Revenue:', grossTotalRevenue);
    console.log('Total Unique Transactions Count:', totalCount);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

testDeduplication();
