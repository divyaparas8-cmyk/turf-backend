const prisma = require('../src/config/prisma');

async function main() {
    console.log('Synchronizing user, owner, and branch statuses in database...');

    const users = await prisma.user.findMany();
    for (const u of users) {
        const owner = await prisma.owner.findFirst({
            where: { OR: [{ userId: u.id }, { email: u.email }] }
        });

        if (owner) {
            console.log(`Syncing Owner & Branches for User "${u.name}" (${u.email}) -> Status: ${u.status}`);
            await prisma.owner.update({
                where: { id: owner.id },
                data: { status: u.status }
            });

            await prisma.branch.updateMany({
                where: { OR: [{ ownerId: owner.id }, { ownerUserId: u.id }] },
                data: { status: u.status }
            });
        } else {
            await prisma.branch.updateMany({
                where: { ownerUserId: u.id },
                data: { status: u.status }
            });
        }
    }

    console.log('✅ All User, Owner, and Branch statuses synced in DB!');
}

main().then(() => {
    prisma.$disconnect();
    process.exit(0);
}).catch(err => {
    console.error(err);
    prisma.$disconnect();
    process.exit(1);
});
