const prisma = require('../src/config/prisma');

async function checkSports() {
    const sports = await prisma.sport.findMany();
    console.log('All Master Sports in DB:', sports);
}

checkSports().then(() => {
    prisma.$disconnect();
    process.exit(0);
}).catch(err => {
    console.error(err);
    prisma.$disconnect();
    process.exit(1);
});
