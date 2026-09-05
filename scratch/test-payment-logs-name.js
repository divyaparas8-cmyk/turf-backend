const prisma = require('../src/config/prisma');

async function checkPaymentLogsCustomer() {
  try {
    const matchPayments = await prisma.matchPayment.findMany({
      include: {
        match: true,
        user: true
      }
    });

    const bookings = await prisma.booking.findMany({});
    const slotToBooking = {};
    for (const b of bookings) {
      if (b.slotId) {
        slotToBooking[b.slotId] = b;
      }
    }

    for (const mp of matchPayments) {
      const linkedBooking = mp.match?.slotId ? slotToBooking[mp.match.slotId] : null;
      console.log('MatchPayment ID:', mp.id);
      console.log('mp.playerName:', mp.playerName);
      console.log('Linked Booking customerName:', linkedBooking ? linkedBooking.customerName : 'None');
      console.log('-----------------------------------');
    }
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

checkPaymentLogsCustomer();
