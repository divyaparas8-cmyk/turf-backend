const prisma = require('../src/config/prisma');

async function main() {
    console.log('Testing plan updates for Enterprise, Pro, and Starter plans...');

    // Enterprise Plan
    const t1 = Date.now();
    await prisma.subscriptionPlan.update({
        where: { id: 'plan_enterprise' },
        data: { monthlyPrice: 4990, updatedAt: new Date() }
    });
    console.log(`✅ Enterprise Plan update succeeded in ${Date.now() - t1}ms`);

    // Pro Plan
    const t2 = Date.now();
    await prisma.subscriptionPlan.update({
        where: { id: 'plan_pro' },
        data: { monthlyPrice: 3000, updatedAt: new Date() }
    });
    console.log(`✅ Pro Plan update succeeded in ${Date.now() - t2}ms`);

    // Starter Plan
    const t3 = Date.now();
    await prisma.subscriptionPlan.update({
        where: { id: 'plan_starter' },
        data: { monthlyPrice: 800, updatedAt: new Date() }
    });
    console.log(`✅ Starter Plan update succeeded in ${Date.now() - t3}ms`);
}

main().then(() => {
    prisma.$disconnect();
    process.exit(0);
}).catch(err => {
    console.error('Update failed:', err);
    prisma.$disconnect();
    process.exit(1);
});
