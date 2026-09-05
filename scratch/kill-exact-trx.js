const prisma = require('../src/config/prisma');

async function main() {
    console.log('Targeting exact thread IDs holding transactions...');
    const trxs = await prisma.$queryRawUnsafe('SELECT trx_mysql_thread_id FROM information_schema.innodb_trx');
    for (const t of trxs) {
        const threadId = t.trx_mysql_thread_id.toString();
        console.log(`Killing MySQL thread ID: ${threadId}...`);
        try {
            await prisma.$executeRawUnsafe(`KILL ${threadId}`);
            console.log(`Successfully killed ${threadId}`);
        } catch (err) {
            console.error(`Error killing ${threadId}:`, err.message);
        }
    }

    // Wait 1 second for rollback
    await new Promise(r => setTimeout(r, 1000));

    const check = await prisma.$queryRawUnsafe('SELECT count(*) as cnt FROM information_schema.innodb_trx');
    console.log('Active InnoDB Transactions left:', check[0].cnt.toString());
}

main().then(() => {
    prisma.$disconnect();
    process.exit(0);
}).catch(err => {
    console.error(err);
    prisma.$disconnect();
    process.exit(1);
});
