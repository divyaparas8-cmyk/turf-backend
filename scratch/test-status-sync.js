const prisma = require('../src/config/prisma');

async function main() {
    console.log('Testing status synchronization across DB tables...');

    // Get user xyz sports arena / xyz
    const user = await prisma.user.findFirst({ where: { email: 'xyz@gmail.com' } });
    if (!user) {
        console.log('User xyz@gmail.com not found');
        return;
    }

    console.log(`Current User "${user.name}" Status:`, user.status);

    const owner = await prisma.owner.findFirst({ where: { OR: [{ userId: user.id }, { email: user.email }] } });
    console.log(`Current Owner Status:`, owner?.status || 'N/A');

    const branches = await prisma.branch.findMany({ where: { OR: [{ ownerId: owner?.id }, { ownerUserId: user.id }] } });
    console.log('Linked Branches Statuses:', branches.map(b => `${b.branchName} (${b.status})`));
}

main().then(() => {
    prisma.$disconnect();
    process.exit(0);
}).catch(err => {
    console.error(err);
    prisma.$disconnect();
    process.exit(1);
});
