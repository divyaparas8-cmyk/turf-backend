const prisma = require('../src/config/prisma');

async function testCancelApiLogic() {
  const rawId = 'BK-1788427312163107';

  let booking = null;
  let numericId = !isNaN(Number(rawId)) ? Number(rawId) : null;

  if (numericId) {
    booking = await prisma.booking.findUnique({ where: { id: numericId } }).catch(() => null);
  }

  if (!booking) {
    booking = await prisma.booking.findFirst({
      where: {
        OR: [
          { bookingCode: rawId },
          { id: isNaN(Number(rawId.replace(/\D/g, ''))) ? -1 : Number(rawId.replace(/\D/g, '')) }
        ]
      }
    }).catch(() => null);
  }

  console.log('Lookup succeeded! Booking:', booking ? { id: booking.id, code: booking.bookingCode } : null);
}

testCancelApiLogic().then(() => prisma.$disconnect());
