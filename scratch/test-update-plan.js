const prisma = require('../src/config/prisma');

async function main() {
    console.log('Testing subscription plan update on MySQL...');

    // Test updating plan_enterprise
    const updatedEnterprise = await prisma.subscriptionPlan.update({
        where: { id: 'plan_enterprise' },
        data: { updatedAt: new Date() }
    });
    console.log('Successfully updated plan_enterprise:', updatedEnterprise.id);

    // Test updating plan_pro
    const updatedPro = await prisma.subscriptionPlan.update({
        where: { id: 'plan_pro' },
        data: { updatedAt: new Date() }
    });
    console.log('Successfully updated plan_pro:', updatedPro.id);

    // Test updating plan_starter
    const updatedStarter = await prisma.subscriptionPlan.update({
        where: { id: 'plan_starter' },
        data: { updatedAt: new Date() }
    });
    console.log('Successfully updated plan_starter:', updatedStarter.id);

    console.log('ALL PLAN UPDATES WORKED INSTANTLY WITHOUT LOCK TIMEOUT!');
}

main().then(() => {
    prisma.$disconnect();
    process.exit(0);
}).catch(err => {
    console.error('Update failed:', err);
    prisma.$disconnect();
    process.exit(1);
});
