const prisma = require('../src/config/prisma');

const genId = (prefix) => `${prefix}_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

async function testSimulatedUpdate() {
    const id = 'br_1788263947145_16239';
    const reqBody = {
        discountOffer: '25% OFF FIRST MATCH',
        couponCode: 'CRICKET25'
    };

    const offerText = reqBody.discountOffer ?? reqBody.discount_offer;
    const promoText = reqBody.couponCode ?? reqBody.coupon_code;

    if (offerText !== undefined || promoText !== undefined) {
        const existingOffer = await prisma.discountOffer.findFirst({ where: { branchId: id } });
        if (existingOffer) {
            const updatedOffer = await prisma.discountOffer.update({
                where: { id: existingOffer.id },
                data: {
                    title: (offerText !== undefined && offerText !== '') ? String(offerText) : existingOffer.title,
                    promoCode: (promoText !== undefined && promoText !== '') ? String(promoText) : existingOffer.promoCode,
                    status: 'ACTIVE'
                }
            });
            console.log('Simulated Offer Update Result:', updatedOffer);
        } else {
            console.log('No existing offer found');
        }
    }
}

testSimulatedUpdate().then(() => {
    prisma.$disconnect();
    process.exit(0);
}).catch(err => {
    console.error(err);
    prisma.$disconnect();
    process.exit(1);
});
