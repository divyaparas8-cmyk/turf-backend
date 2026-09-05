const prisma = require('../src/config/prisma');

async function testMark() {
    const branch = await prisma.branch.findFirst({
        where: { branchName: { contains: 'mark' } }
    });
    console.log('Testing sports sync for branch:', branch.id, branch.branchName);

    const sportNames = ['Cricket', 'Football', 'Badminton', 'Tennis'];
    for (const sName of sportNames) {
        let master = await prisma.sport.findFirst({ where: { name: sName } });
        if (!master) {
            master = await prisma.sport.create({
                data: { id: `sp_${sName.toLowerCase()}`, name: sName, icon: '⚽', category: 'Turf Sport' }
            });
        }
        const bs = await prisma.branchSport.upsert({
            where: { id: `bs_${branch.id}_${master.id}` },
            update: { regularPrice: 800, peakPrice: 1200, status: 'ACTIVE' },
            create: {
                id: `bs_${branch.id}_${master.id}`,
                branchId: branch.id,
                sportId: master.id,
                regularPrice: 800,
                peakPrice: 1200,
                status: 'ACTIVE'
            }
        });
        console.log(`Linked ${sName}:`, bs.id);
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
    console.log('Saved offer:', offer.title, offer.promoCode);
}

testMark().then(() => {
    prisma.$disconnect();
    process.exit(0);
}).catch(err => {
    console.error(err);
    prisma.$disconnect();
    process.exit(1);
});
