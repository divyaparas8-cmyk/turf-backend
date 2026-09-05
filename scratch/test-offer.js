const prisma = require('../src/config/prisma');

async function testOffer() {
    const branch = await prisma.branch.findFirst({
        include: { discountOffers: true }
    });
    console.log('Sample Branch:', branch.id, branch.branchName);
    console.log('Existing discountOffers:', branch.discountOffers);

    if (branch.discountOffers.length > 0) {
        const updated = await prisma.discountOffer.update({
            where: { id: branch.discountOffers[0].id },
            data: { title: '30% OFF FIRST MATCH', promoCode: 'CRICKET25' }
        });
        console.log('Updated offer:', updated);
    } else {
        const created = await prisma.discountOffer.create({
            data: {
                id: `disc_${Date.now()}`,
                branchId: branch.id,
                title: '30% OFF FIRST MATCH',
                promoCode: 'CRICKET25',
                discountType: 'PERCENTAGE',
                discountValue: 30.00,
                startDate: new Date(),
                endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
                status: 'ACTIVE'
            }
        });
        console.log('Created offer:', created);
    }
}

testOffer().then(() => {
    prisma.$disconnect();
    process.exit(0);
}).catch(err => {
    console.error('Test offer error:', err);
    prisma.$disconnect();
    process.exit(1);
});
