const prisma = require('../src/config/prisma');

async function main() {
    console.log('=== DATABASE REVENUE & COUNT ANALYSIS ===');

    const totalBranches = await prisma.branch.count();
    const totalOwnersTable = await prisma.owner.count();
    const totalUsersTable = await prisma.user.count();

    const usersByRole = await prisma.user.groupBy({
        by: ['role'],
        _count: { id: true }
    });

    console.log('Total Branches in `branches` table:', totalBranches);
    console.log('Total Owners in `owners` table:', totalOwnersTable);
    console.log('Total Users in `users` table:', totalUsersTable);
    console.log('Users breakdown by role:', usersByRole);

    const owners = await prisma.owner.findMany({
        select: { id: true, fullName: true, email: true, status: true, _count: { select: { branches: true } } }
    });
    console.log('\nAll Owners in `owners` table:', JSON.stringify(owners, null, 2));

    const usersAdminRole = await prisma.user.findMany({
        where: { OR: [{ role: 'ADMIN' }, { role: 'OWNER' }] },
        select: { id: true, name: true, email: true, role: true, status: true }
    });
    console.log('\nAll Users with ADMIN/OWNER role:', JSON.stringify(usersAdminRole, null, 2));
}

main().then(() => {
    prisma.$disconnect();
    process.exit(0);
}).catch(err => {
    console.error(err);
    prisma.$disconnect();
    process.exit(1);
});
