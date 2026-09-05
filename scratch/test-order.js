const prisma = require('../src/config/prisma');

async function testOrder() {
  try {
    const isSuperAdmin = true;
    const pWhere = {};
    const bWhere = {};
    const mWhere = {};

    const [payments, bookings, matchPayments] = await Promise.all([
      prisma.payment.findMany({ where: pWhere, include: { booking: { include: { slot: { include: { sport: true } } } } }, orderBy: { createdAt: 'desc' } }),
      prisma.booking.findMany({ where: bWhere, include: { slot: { include: { sport: true } } }, orderBy: { createdAt: 'desc' } }),
      prisma.matchPayment.findMany({ where: mWhere, include: { match: { include: { slot: { include: { sport: true } }, sport: true } } }, orderBy: { createdAt: 'desc' } })
    ]);

    const allTransactions = [];
    const processedBookingIds = new Set();
    const processedSlotIds = new Set();

    for (const p of payments) {
      if (p.bookingId) processedBookingIds.add(p.bookingId);
      if (p.booking?.slotId) processedSlotIds.add(p.booking.slotId);
      allTransactions.push({
        id: `pay_${p.id}`,
        amount: Number(p.amount || 0),
        customerName: p.customerName || p.booking?.customerName || p.user?.name || '',
        createdAt: p.createdAt
      });
    }

    for (const b of bookings) {
      if (processedBookingIds.has(b.id)) continue;
      if (b.slotId && processedSlotIds.has(b.slotId)) continue;
      processedBookingIds.add(b.id);
      if (b.slotId) processedSlotIds.add(b.slotId);
      allTransactions.push({
        id: `bk_${b.id}`,
        amount: Number(b.amount || 0),
        customerName: b.customerName || '',
        createdAt: b.createdAt
      });
    }

    for (const mp of matchPayments) {
      const slotId = mp.match?.slotId;
      if (slotId && processedSlotIds.has(slotId)) continue;
      if (slotId) processedSlotIds.add(slotId);
      const matchKey = mp.matchId || mp.id;
      if (processedBookingIds.has(matchKey) || processedBookingIds.has(mp.id)) continue;
      processedBookingIds.add(matchKey);
      processedBookingIds.add(mp.id);
      allTransactions.push({
        id: `mpay_${mp.id}`,
        amount: Number(mp.amount || 0),
        customerName: mp.playerName || 'Match Player',
        createdAt: mp.createdAt
      });
    }

    allTransactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    console.log('=== RESULTING TRANSACTIONS ===');
    console.log(allTransactions);

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

testOrder();
