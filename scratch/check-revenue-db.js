const prisma = require('../src/config/prisma');

async function check() {
  try {
    const payments = await prisma.payment.findMany({ where: { status: 'COMPLETED' } });
    const bookings = await prisma.booking.findMany({ where: { status: 'COMPLETED' } });
    const matchPayments = await prisma.matchPayment.findMany({ where: { paymentStatus: 'COMPLETED' } });
    
    console.log('=== PAYMENTS (COMPLETED) ===');
    console.log(payments.map(p => ({ id: p.id, bookingId: p.bookingId, amount: Number(p.amount), createdAt: p.createdAt })));
    
    console.log('=== BOOKINGS (COMPLETED) ===');
    console.log(bookings.map(b => ({ id: b.id, amount: Number(b.amount), createdAt: b.createdAt })));

    console.log('=== MATCH PAYMENTS (COMPLETED) ===');
    console.log(matchPayments.map(m => ({ id: m.id, amount: Number(m.amount), createdAt: m.createdAt })));

    const pSum = payments.reduce((acc, p) => acc + Number(p.amount || 0), 0);
    const payBookingIds = new Set(payments.map(p => p.bookingId).filter(Boolean));
    const standaloneBookings = bookings.filter(b => !payBookingIds.has(b.id));
    const bSum = standaloneBookings.reduce((acc, b) => acc + Number(b.amount || 0), 0);
    const mSum = matchPayments.reduce((acc, m) => acc + Number(m.amount || 0), 0);

    console.log('\n=== REVENUE SUMMARY ===');
    console.log('Payment Table Sum:', pSum);
    console.log('Standalone Booking Table Sum:', bSum);
    console.log('Match Payment Table Sum:', mSum);
    console.log('TOTAL REVENUE FROM DB:', pSum + bSum + mSum);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

check();
