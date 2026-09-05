const prisma = require('../src/config/prisma');

async function test() {
    const tournaments = await prisma.tournament.findMany({
        include: {
            sport: true,
            category: true,
            branch: { include: { ownerUser: { select: { id: true, name: true, email: true } } } },
            _count: { select: { teams: true } }
        }
    });
    console.log('Total Tournaments in DB:', tournaments.length);
    console.log('Tournaments details:');
    tournaments.forEach(t => {
        console.log(`- ID: ${t.id}, Title: ${t.title}, Status: ${t.status}, BranchId: ${t.branchId}`);
    });
    await prisma.$disconnect();
}

test().catch(err => {
    console.error(err);
    process.exit(1);
});
