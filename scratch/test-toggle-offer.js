const prisma = require('../src/config/prisma');

async function testToggleStatus() {
    console.log('Testing DiscountOffer status toggling...');
    const offers = await prisma.discountOffer.findMany({ where: { deletedAt: null }, take: 1 });
    if (!offers.length) {
        console.log('No discount offers found to test.');
        return;
    }

    const offer = offers[0];
    console.log('Found offer:', offer.id, offer.title, 'Current status:', offer.status);

    const targetStatus = offer.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    console.log(`Toggling status to: ${targetStatus}...`);

    const updated = await prisma.discountOffer.update({
        where: { id: offer.id },
        data: { status: targetStatus }
    });

    console.log('Status updated successfully in DB:', updated.id, updated.status);

    // Revert back
    await prisma.discountOffer.update({
        where: { id: offer.id },
        data: { status: offer.status }
    });
    console.log('Reverted status back to original:', offer.status);
}

testToggleStatus()
    .then(() => {
        prisma.$disconnect();
        process.exit(0);
    })
    .catch(err => {
        console.error('Test toggle status failed:', err);
        prisma.$disconnect();
        process.exit(1);
    });
