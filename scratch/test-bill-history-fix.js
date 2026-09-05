const prisma = require('../src/config/prisma');

async function testBillHistoryFix() {
    const [payments, matchPayments] = await Promise.all([
        prisma.payment.findMany({ include: { user: true, booking: { include: { slot: { include: { branch: true } } } } }, orderBy: { createdAt: 'desc' } }),
        prisma.matchPayment.findMany({ include: { user: true, match: { include: { branch: true } } }, orderBy: { createdAt: 'desc' } })
    ]);

    const matchSlotIds = matchPayments.map(mp => mp.match?.slotId).filter(Boolean);
    const linkedBookings = matchSlotIds.length > 0
        ? await prisma.booking.findMany({ where: { slotId: { in: matchSlotIds } } })
        : [];
    const bookingBySlot = Object.fromEntries(linkedBookings.map(b => [b.slotId, b]));

    const logs = payments.map(p => ({ id: `pay_${p.id}`, status: (p.status || '').toUpperCase() }));

    for (const mp of matchPayments) {
        const linkedBooking = mp.match?.slotId ? bookingBySlot[mp.match.slotId] : null;
        let resolvedStatus = 'PENDING';
        const mpStatusUpper = (mp.paymentStatus || '').toUpperCase();
        const bkStatusUpper = (linkedBooking?.status || '').toUpperCase();

        if (mpStatusUpper === 'REFUNDED' || bkStatusUpper === 'REFUNDED') {
            resolvedStatus = 'REFUNDED';
        } else if (mpStatusUpper === 'CANCELLED' || mpStatusUpper === 'FAILED' || bkStatusUpper === 'CANCELLED') {
            resolvedStatus = 'CANCELLED';
        } else if (mpStatusUpper === 'COMPLETED' || mpStatusUpper === 'PAID' || mpStatusUpper === 'CONFIRMED' || bkStatusUpper === 'COMPLETED' || bkStatusUpper === 'CONFIRMED') {
            resolvedStatus = 'COMPLETED';
        } else if (mpStatusUpper) {
            resolvedStatus = mpStatusUpper;
        }

        logs.push({
            id: `INV-${mp.id.substring(0, 10)}`,
            mpId: mp.id,
            paymentStatus: mp.paymentStatus,
            linkedBookingStatus: linkedBooking?.status || null,
            resolvedStatus
        });
    }

    console.log('--- TEST RESULTS ---');
    console.table(logs.slice(0, 10));

    await prisma.$disconnect();
}

testBillHistoryFix().catch(err => {
    console.error(err);
    process.exit(1);
});
