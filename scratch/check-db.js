const prisma = require('../src/config/prisma');

async function main() {
    const branches = await prisma.branch.findMany({
        select: {
            id: true,
            branchName: true,
            logo: true,
            owner: { select: { id: true, fullName: true, profileImage: true } }
        }
    });

    console.log('=== BRANCH LOGOS & OWNER PROFILE IMAGES ===');
    branches.forEach(b => {
        console.log(`Branch: ${b.branchName.padEnd(20)} | Logo: ${b.logo || 'NULL'} | Owner: ${b.owner?.fullName || 'N/A'} | ProfileImg: ${b.owner?.profileImage || 'NULL'}`);
    });
}

main().then(() => {
    prisma.$disconnect();
    process.exit(0);
}).catch(err => {
    console.error(err);
    prisma.$disconnect();
    process.exit(1);
});
