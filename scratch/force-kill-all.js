const prisma = require('../src/config/prisma');

async function main() {
    console.log('Force killing all MySQL connection threads...');
    const processes = await prisma.$queryRawUnsafe('SHOW PROCESSLIST');
    const [myConn] = await prisma.$queryRawUnsafe('SELECT CONNECTION_ID() as id');
    const myId = Number(myConn.id);

    console.log('My Connection ID:', myId);

    for (const proc of processes) {
        const rawId = proc.f0 ?? proc.Id ?? proc.id;
        const id = Number(rawId);
        if (id && id !== myId) {
            console.log(`Killing process ${id}...`);
            await prisma.$executeRawUnsafe(`KILL ${id}`).catch(err => console.log(`Result for ${id}:`, err.message));
        }
    }

    const remaining = await prisma.$queryRawUnsafe('SELECT trx_id, trx_state FROM information_schema.innodb_trx');
    console.log('Remaining InnoDB Transactions count:', remaining.length);
}

main().then(() => {
    prisma.$disconnect();
    process.exit(0);
}).catch(err => {
    console.error(err);
    prisma.$disconnect();
    process.exit(1);
});
