const prisma = require('../src/config/prisma');

async function testCancelLookup() {
  const rawId = 'BK-1788427312163107';

  let id = isNaN(Number(rawId)) ? null : Number(rawId);
  console.log('Direct Number(rawId):', id); // Should be NaN

  let booking = null;
  if (id) {
    booking = await prisma.booking.findUnique({ where: { id } });
  }
  if (!booking) {
    booking = await prisma.booking.findFirst({
      where: {
        OR: [
          { bookingCode: rawId },
          { id: isNaN(Number(rawId.replace(/\D/g, ''))) ? -1 : Number(rawId.replace(/\D/g, '')) }
        ]
      }
    });
  }

  console.log('Found booking by code:', booking);
}

testCancelLookup().then(() => prisma.$disconnect());
