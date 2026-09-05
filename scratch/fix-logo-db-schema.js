const prisma = require('../src/config/prisma');

async function main() {
    console.log('Modifying logo and profile_image columns in MySQL to LONGTEXT...');

    try {
        await prisma.$queryRawUnsafe('ALTER TABLE branches MODIFY COLUMN logo LONGTEXT DEFAULT NULL');
        console.log('✅ branches.logo modified to LONGTEXT');
    } catch (e) {
        console.error('branches.logo alter error:', e.message);
    }

    try {
        await prisma.$queryRawUnsafe('ALTER TABLE owners MODIFY COLUMN profile_image LONGTEXT DEFAULT NULL');
        console.log('✅ owners.profile_image modified to LONGTEXT');
    } catch (e) {
        console.error('owners.profile_image alter error:', e.message);
    }

    console.log('\nCleaning up broken/truncated base64 logos in database...');
    const branches = await prisma.branch.findMany({ select: { id: true, branchName: true, logo: true } });

    for (const b of branches) {
        if (b.logo && b.logo.startsWith('data:image/') && b.logo.length < 500) {
            console.log(`Cleaning up truncated base64 logo for branch: ${b.branchName} (${b.id})`);
            await prisma.branch.update({
                where: { id: b.id },
                data: { logo: null }
            });
        }
    }

    console.log('✅ DB Schema & Data Cleanup complete!');
}

main().then(() => {
    prisma.$disconnect();
    process.exit(0);
}).catch(err => {
    console.error(err);
    prisma.$disconnect();
    process.exit(1);
});
