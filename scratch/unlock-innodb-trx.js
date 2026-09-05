const prisma = require('../src/config/prisma');

async function main() {
    console.log('Inspecting InnoDB Transactions...');
    try {
        const trxs = await prisma.$queryRawUnsafe('SELECT trx_id, trx_state, trx_started, trx_mysql_thread_id, trx_query FROM information_schema.innodb_trx');
        console.log('Active InnoDB Transactions:', trxs);

        for (const trx of trxs) {
            const threadId = Number(trx.trx_mysql_thread_id);
            if (threadId) {
                console.log(`Killing MySQL thread ${threadId} holding transaction ${trx.trx_id}...`);
                try {
                    await prisma.$executeRawUnsafe(`KILL ${threadId}`);
                    console.log(`Successfully killed thread ${threadId}`);
                } catch (e) {
                    console.error(`Error killing thread ${threadId}:`, e.message);
                }
            }
        }
    } catch (err) {
        console.error('Error querying innodb_trx:', err.message);
    }

    console.log('\nRetrying plan update...');
    const startTime = Date.now();
    const updated = await prisma.subscriptionPlan.update({
        where: { id: 'plan_enterprise' },
        data: { updatedAt: new Date() }
    });
    console.log(`✅ Plan update succeeded in ${Date.now() - startTime}ms!`);
}

main().then(() => {
    prisma.$disconnect();
    process.exit(0);
}).catch(err => {
    console.error('Error:', err);
    prisma.$disconnect();
    process.exit(1);
});
