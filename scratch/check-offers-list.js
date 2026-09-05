const prisma = require('../src/config/prisma');

async function checkOffers() {
    const branchId = 'br_1788263947145_16239';
    const offers = await prisma.discountOffer.findMany({
        where: { branchId },
        orderBy: { updatedAt: 'desc' }
    });
    console.log('All DiscountOffers for mark k:', offers);
}

checkOffers().then(() => {
    prisma.$disconnect();
    process.exit(0);
}).catch(err => {
    console.error(err);
    prisma.$disconnect();
    process.exit(1);
});
