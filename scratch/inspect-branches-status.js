const prisma = require('../src/config/prisma');

async function main() {
    try {
        const branches = await prisma.branch.findMany({
            select: {
                id: true,
                branchName: true,
                city: true,
                status: true,
                ownerId: true,
                branchSports: {
                    select: { id: true, sportId: true, status: true, regularPrice: true }
                }
            }
        });
        console.log('--- ALL BRANCHES IN DB ---');
        console.log(JSON.stringify(branches, null, 2));
    } catch (err) {
        console.error('Error querying branches:', err);
    } finally {
        await prisma.$disconnect();
    }
}

main();
