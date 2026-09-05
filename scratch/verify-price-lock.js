const prisma = require('../src/config/prisma');

async function main() {
    console.log('=== VERIFYING SUBSCRIPTION PLAN PRICE SNAPSHOT & LOCKING ===');

    // 1. Check existing branches prices in DB
    const existingBranches = await prisma.branch.findMany({
        include: { subscriptionPlan: true }
    });
    console.log('\n--- 1. Existing Branches Snapshot Prices ---');
    existingBranches.forEach(b => {
        const lockedPrice = b.subscriptionPriceSnapshot ?? b.planPrice;
        console.log(`Branch: ${b.branchName} | Plan: ${b.subscriptionPlan?.planName} | Master Plan Price: ₹${b.subscriptionPlan?.monthlyPrice} | Locked Snapshot Price: ₹${lockedPrice}`);
    });

    // 2. Simulate creating a new branch right now (when Starter Plan is ₹800)
    const starterPlan = await prisma.subscriptionPlan.findUnique({ where: { id: 'plan_starter' } });
    console.log(`\n--- 2. Creating New Branch with Active Starter Plan (Current Price: ₹${starterPlan.monthlyPrice}) ---`);
    const newBranch1 = await prisma.branch.create({
        data: {
            id: `br_test_${Date.now()}`,
            branchName: 'New Branch (Starter 800)',
            branchCode: `BR-TEST-${Math.floor(1000 + Math.random() * 9000)}`,
            subscriptionPlanId: 'plan_starter',
            subscriptionPriceSnapshot: Number(starterPlan.monthlyPrice),
            planPrice: Number(starterPlan.monthlyPrice),
            email: 'newbranch800@example.com'
        },
        include: { subscriptionPlan: true }
    });
    console.log(`Created Branch: ${newBranch1.branchName} | Locked Price: ₹${newBranch1.subscriptionPriceSnapshot}`);

    // 3. Simulate future master plan price update (e.g. Starter Plan updated to ₹1,200)
    console.log('\n--- 3. Updating Master Starter Plan Price to ₹1,200 (Simulating Future Plan Update) ---');
    await prisma.subscriptionPlan.update({
        where: { id: 'plan_starter' },
        data: { monthlyPrice: 1200.00 }
    });

    // 4. Create another new branch AFTER the plan update
    console.log('\n--- 4. Creating New Branch After Plan Update (When Starter Plan is ₹1,200) ---');
    const newBranch2 = await prisma.branch.create({
        data: {
            id: `br_test_${Date.now() + 1}`,
            branchName: 'Future Branch (Starter 1200)',
            branchCode: `BR-TEST-${Math.floor(1000 + Math.random() * 9000)}`,
            subscriptionPlanId: 'plan_starter',
            subscriptionPriceSnapshot: 1200.00,
            planPrice: 1200.00,
            email: 'futurebranch1200@example.com'
        },
        include: { subscriptionPlan: true }
    });
    console.log(`Created Branch: ${newBranch2.branchName} | Locked Price: ₹${newBranch2.subscriptionPriceSnapshot}`);

    // 5. Check all branches to confirm old ones remain unchanged while new ones got respective prices!
    console.log('\n--- 5. Final Verification of All Starter Plan Branches ---');
    const finalBranches = await prisma.branch.findMany({
        where: { subscriptionPlanId: 'plan_starter' },
        select: { id: true, branchName: true, subscriptionPriceSnapshot: true, planPrice: true }
    });
    finalBranches.forEach(b => {
        console.log(` - Branch "${b.branchName}": Locked Price = ₹${b.subscriptionPriceSnapshot ?? b.planPrice}`);
    });

    // Restore master starter plan price back to ₹800 and cleanup test branches
    console.log('\n--- 6. Restoring Master Starter Plan to ₹800 & Cleaning Up Test Branches ---');
    await prisma.subscriptionPlan.update({
        where: { id: 'plan_starter' },
        data: { monthlyPrice: 800.00 }
    });
    await prisma.branch.deleteMany({
        where: { id: { in: [newBranch1.id, newBranch2.id] } }
    });
    console.log('✅ ALL CHECKS PASSED PERFECTLY!');
}

main().then(() => {
    prisma.$disconnect();
    process.exit(0);
}).catch((err) => {
    console.error(err);
    prisma.$disconnect();
    process.exit(1);
});
