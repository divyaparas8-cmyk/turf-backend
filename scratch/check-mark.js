const prisma = require('../src/config/prisma');

async function main() {
    const branches = await prisma.branch.findMany({
        where: { branchName: { contains: 'mark' } },
        include: { branchSports: { include: { sport: true } }, discountOffers: true }
    });
    console.log('Mark Branch Data:', JSON.stringify(branches, null, 2));
}

main().then(() => {
    prisma.$disconnect();
    process.exit(0);
}).catch(err => {
    console.error(err);
    prisma.$disconnect();
    process.exit(1);
});
