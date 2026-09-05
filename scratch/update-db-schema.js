const prisma = require('../src/config/prisma');

async function main() {
    console.log('Checking branches table columns...');
    const columns = await prisma.$queryRawUnsafe('DESCRIBE branches');
    const fieldNames = columns.map(c => c.Field);

    if (!fieldNames.includes('subscription_price_snapshot')) {
        console.log('Adding subscription_price_snapshot column...');
        await prisma.$queryRawUnsafe('ALTER TABLE branches ADD COLUMN subscription_price_snapshot DECIMAL(10,2) DEFAULT NULL');
    }
    if (!fieldNames.includes('plan_price')) {
        console.log('Adding plan_price column...');
        await prisma.$queryRawUnsafe('ALTER TABLE branches ADD COLUMN plan_price DECIMAL(10,2) DEFAULT 0.00');
    }

    console.log('Backfilling existing branches with historical pricing snapshot...');
    
    // For starter plan branches created before: original price was 1000
    const updateStarter = await prisma.$executeRawUnsafe(
        `UPDATE branches SET subscription_price_snapshot = 1000.00, plan_price = 1000.00 WHERE subscription_plan_id = 'plan_starter' AND (subscription_price_snapshot IS NULL OR plan_price = 0)`
    );
    console.log('Starter branches updated:', updateStarter);

    // For pro plan branches: 3000
    const updatePro = await prisma.$executeRawUnsafe(
        `UPDATE branches SET subscription_price_snapshot = 3000.00, plan_price = 3000.00 WHERE subscription_plan_id = 'plan_pro' AND (subscription_price_snapshot IS NULL OR plan_price = 0)`
    );
    console.log('Pro branches updated:', updatePro);

    // For enterprise plan branches: 4990
    const updateEnterprise = await prisma.$executeRawUnsafe(
        `UPDATE branches SET subscription_price_snapshot = 4990.00, plan_price = 4990.00 WHERE subscription_plan_id = 'plan_enterprise' AND (subscription_price_snapshot IS NULL OR plan_price = 0)`
    );
    console.log('Enterprise branches updated:', updateEnterprise);

    const allBranches = await prisma.$queryRawUnsafe('SELECT id, branch_name, subscription_plan_id, subscription_price_snapshot, plan_price FROM branches');
    console.log('Updated branches in DB:', allBranches);
}

main().catch(console.error).finally(() => prisma.$disconnect());
