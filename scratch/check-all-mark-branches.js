const prisma = require('../src/config/prisma');

async function checkAllMark() {
    const branches = await prisma.branch.findMany({
        where: { OR: [{ branchName: { contains: 'mark' } }, { owner: { fullName: { contains: 'mark' } } }] },
        include: { discountOffers: true, owner: true }
    });
    console.log('All Mark Branches in DB:', JSON.stringify(branches, null, 2));
}

checkAllMark().then(() => {
    prisma.$disconnect();
    process.exit(0);
}).catch(err => {
    console.error(err);
    prisma.$disconnect();
    process.exit(1);
});
