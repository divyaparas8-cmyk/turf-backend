const prisma = require('../src/config/prisma');

async function removeRailwayOffer() {
    const offerId = 'disc_1788429432459_1861';
    console.log(`Searching for offer ${offerId} in current database...`);

    const offer = await prisma.discountOffer.findUnique({
        where: { id: offerId }
    });

    if (offer) {
        console.log('Found offer in DB:', offer.id, offer.title, offer.promoCode);
        // Soft delete (or hard delete)
        await prisma.discountOffer.update({
            where: { id: offerId },
            data: { deletedAt: new Date() }
        });
        console.log(`Successfully soft-deleted offer ${offerId}`);
    } else {
        console.log(`Offer ${offerId} not found in DB by exact ID. Checking by promoCode CREC25...`);
        const byCode = await prisma.discountOffer.findMany({
            where: { promoCode: 'CREC25' }
        });
        for (const o of byCode) {
            console.log('Found matching offer by promoCode:', o.id, o.title);
            await prisma.discountOffer.update({
                where: { id: o.id },
                data: { deletedAt: new Date() }
            });
            console.log(`Soft-deleted offer ${o.id}`);
        }
    }
}

removeRailwayOffer()
    .then(() => {
        prisma.$disconnect();
        process.exit(0);
    })
    .catch(err => {
        console.error('Failed to remove offer:', err);
        prisma.$disconnect();
        process.exit(1);
    });
