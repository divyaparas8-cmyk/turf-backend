const prisma = require('../src/config/prisma');

async function removeOffer() {
    const offerId = 'disc_1788429432459_1861';
    console.log(`Removing discount offer: ${offerId}...`);
    
    // Check if offer exists
    const offer = await prisma.discountOffer.findUnique({
        where: { id: offerId }
    });

    if (!offer) {
        console.log(`Offer ${offerId} not found or already removed.`);
        return;
    }

    console.log('Found offer:', offer.id, offer.title, offer.promoCode);

    // Soft delete (or hard delete if needed, in application logic deletedAt is used)
    const updated = await prisma.discountOffer.update({
        where: { id: offerId },
        data: { deletedAt: new Date() }
    });

    console.log('Successfully marked offer as deleted (deletedAt set):', updated.id, updated.deletedAt);
}

removeOffer()
    .then(() => {
        prisma.$disconnect();
        process.exit(0);
    })
    .catch(err => {
        console.error('Error deleting offer:', err);
        prisma.$disconnect();
        process.exit(1);
    });
