const prisma = require('../src/config/prisma');

async function testDirectUpdate() {
    const branchId = 'br_1788263947145_16239';

    // Update branch directly in Prisma
    const updated = await prisma.branch.update({
        where: { id: branchId },
        data: {
            dimensionsSqFt: 6000,
            openingTime: '08:00 AM',
            closingTime: '11:00 PM',
            minPriceHourly: 925.00,
            surfaceType: 'TurfPro Synthetic Arena'
        }
    });
    console.log('Direct Branch Update:', updated);

    // Upsert discount offer
    const offer = await prisma.discountOffer.upsert({
        where: { id: `disc_${branchId}` },
        update: {
            title: '30% OFF FIRST MATCH',
            promoCode: 'CRICKET25',
            status: 'ACTIVE'
        },
        create: {
            id: `disc_${branchId}`,
            branchId,
            title: '30% OFF FIRST MATCH',
            promoCode: 'CRICKET25',
            discountType: 'PERCENTAGE',
            discountValue: 30.00,
            startDate: new Date(),
            endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            status: 'ACTIVE'
        }
    });
    console.log('Direct Discount Offer Update:', offer);

    const full = await prisma.branch.findUnique({
        where: { id: branchId },
        include: { discountOffers: true, branchSports: { include: { sport: true } } }
    });
    console.log('Full branch after update:', JSON.stringify(full, null, 2));
}

testDirectUpdate().then(() => {
    prisma.$disconnect();
    process.exit(0);
}).catch(err => {
    console.error('Update error:', err);
    prisma.$disconnect();
    process.exit(1);
});
