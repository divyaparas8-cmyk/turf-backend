const prisma = require('../src/config/prisma');

async function testFullUpdate() {
    const branch = await prisma.branch.findFirst({
        where: { branchName: { contains: 'mark' } },
        include: { branchSports: { include: { sport: true } }, discountOffers: true }
    });
    console.log('Before update branch:', branch.id, branch.branchName);
    console.log('Before sports:', branch.branchSports);
    console.log('Before offers:', branch.discountOffers);

    // Let's create sports if none exist
    const sports = await prisma.sport.findMany({ take: 3 });
    for (const s of sports) {
        const bs = await prisma.branchSport.upsert({
            where: { id: `bs_${branch.id}_${s.id}` },
            update: { regularPrice: 800, peakPrice: 1200 },
            create: {
                id: `bs_${branch.id}_${s.id}`,
                branchId: branch.id,
                sportId: s.id,
                regularPrice: 800,
                peakPrice: 1200,
                status: 'ACTIVE'
            }
        });
        console.log('Upserted branchSport:', bs);
    }

    const offer = await prisma.discountOffer.upsert({
        where: { id: `disc_${branch.id}` },
        update: { title: '30% OFF FIRST MATCH', promoCode: 'CRICKET25', status: 'ACTIVE' },
        create: {
            id: `disc_${branch.id}`,
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
    console.log('Upserted offer:', offer);

    const reloaded = await prisma.branch.findUnique({
        where: { id: branch.id },
        include: { branchSports: { include: { sport: true } }, discountOffers: true }
    });
    console.log('After update sports count:', reloaded.branchSports.length);
    console.log('After update offers count:', reloaded.discountOffers.length);
}

testFullUpdate().then(() => {
    prisma.$disconnect();
    process.exit(0);
}).catch(err => {
    console.error(err);
    prisma.$disconnect();
    process.exit(1);
});
