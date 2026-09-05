const prisma = require('../src/config/prisma');

async function main() {
    console.log('Inspecting abc@gmail.com user, owner, and branches in DB...');

    const user = await prisma.user.findFirst({ where: { email: 'abc@gmail.com' } });
    console.log('USER:', user);

    const owner = await prisma.owner.findFirst({ where: { OR: [{ userId: user?.id }, { email: 'abc@gmail.com' }] } });
    console.log('OWNER:', owner);

    const branches = await prisma.branch.findMany({
        where: {
            OR: [
                { ownerId: owner?.id },
                { ownerUserId: user?.id },
                { email: 'abc@gmail.com' }
            ]
        }
    });

    console.log('BRANCHES:', branches.map(b => ({ id: b.id, name: b.branchName, status: b.status, ownerId: b.ownerId, ownerUserId: b.ownerUserId })));
}

main().then(() => {
    prisma.$disconnect();
    process.exit(0);
}).catch(err => {
    console.error(err);
    prisma.$disconnect();
    process.exit(1);
});
