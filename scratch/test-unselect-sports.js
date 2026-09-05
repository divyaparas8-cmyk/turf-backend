const prisma = require('../src/config/prisma');

async function testUnselect() {
    const branchId = 'br_1788263947145_16239';

    // Keep ONLY Cricket
    const cricketSport = await prisma.sport.findFirst({ where: { name: 'Cricket' } });
    if (cricketSport) {
        await prisma.branchSport.deleteMany({
            where: {
                branchId,
                sportId: { notIn: [cricketSport.id] }
            }
        });
    }

    const reloaded = await prisma.branch.findUnique({
        where: { id: branchId },
        include: { branchSports: { include: { sport: true } } }
    });
    console.log('Branch sports after unselecting non-cricket:', reloaded.branchSports.map(bs => bs.sport.name));
}

testUnselect().then(() => {
    prisma.$disconnect();
    process.exit(0);
}).catch(err => {
    console.error(err);
    prisma.$disconnect();
    process.exit(1);
});
