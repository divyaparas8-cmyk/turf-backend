const prisma = require('../src/config/prisma');

async function checkAllPayments() {
  try {
    const payments = await prisma.payment.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    console.log('--- PAYMENTS (prisma.payment) ---');
    payments.forEach(p => {
      console.log(`- ID: ${p.id} | Invoice: ${p.invoiceNumber} | Customer: ${p.customerName} | Status: ${p.status} | Amount: ${p.amount}`);
    });

    const matchPayments = await prisma.matchPayment.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    console.log('\n--- MATCH PAYMENTS (prisma.matchPayment) ---');
    matchPayments.forEach(mp => {
      console.log(`- ID: ${mp.id} | Customer: ${mp.playerName} | PaymentStatus: ${mp.paymentStatus} | CommStatus: ${mp.commissionStatus} | OwnerStatus: ${mp.ownerPayoutStatus} | Amount: ${mp.amount}`);
    });

  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

checkAllPayments();
