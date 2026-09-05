const prisma = require('../src/config/prisma');

async function test() {
    const payments = await prisma.payment.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' }
    });
    console.log('Payments count:', payments.length);
    console.log('Payments sample:', payments);

    const matchPayments = await prisma.matchPayment.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { match: true }
    });
    console.log('MatchPayments count:', matchPayments.length);
    console.log('MatchPayments sample:', matchPayments);

    await prisma.$disconnect();
}

test().catch(err => {
    console.error(err);
    process.exit(1);
});
