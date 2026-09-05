const prisma = require('../src/config/prisma');

async function main() {
    const trxs = await prisma.$queryRawUnsafe('SELECT * FROM information_schema.innodb_trx');
    console.log('InnoDB Transactions:', JSON.stringify(trxs, (key, value) => typeof value === 'bigint' ? value.toString() : value, 2));
}

main().then(() => {
    prisma.$disconnect();
    process.exit(0);
}).catch(err => {
    console.error(err);
    prisma.$disconnect();
    process.exit(1);
});
