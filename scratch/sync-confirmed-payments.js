const prisma = require('../src/config/prisma');

async function syncConfirmedPayments() {
  try {
    const updated = await prisma.matchPayment.updateMany({
      where: { commissionStatus: 'CONFIRMED' },
      data: {
        paymentStatus: 'COMPLETED',
        ownerPayoutStatus: 'CONFIRMED'
      }
    });

    console.log(`Updated ${updated.count} matchPayment records to COMPLETED.`);

    const updatedPayments = await prisma.payment.updateMany({
      where: { status: 'PENDING' },
      data: { status: 'COMPLETED' }
    });

    console.log(`Updated ${updatedPayments.count} payment records to COMPLETED.`);

  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

syncConfirmedPayments();
