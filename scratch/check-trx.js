const prisma = require('../src/config/prisma');

async function main() {
    const trxs = await prisma.$queryRawUnsafe('SELECT trx_id, trx_state, trx_started, trx_mysql_thread_id, trx_query FROM information_schema.innodb_trx');
    console.log('Active InnoDB Transactions Count:', trxs.length);
    console.log('Active Transactions:', trxs);
}

main().then(() => {
    prisma.$disconnect();
    process.exit(0);
}).catch(err => {
    console.error('Error:', err);
    prisma.$disconnect();
    process.exit(1);
});
