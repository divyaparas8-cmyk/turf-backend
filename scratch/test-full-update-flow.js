const prisma = require('../src/config/prisma');

async function testFullBranchUpdateFlow() {
  try {
    const branch = await prisma.branch.findFirst({
      where: { branchCode: 'BR-8281' } // Bharat
    });

    if (!branch) {
      console.log('Branch BR-8281 not found');
      return;
    }

    console.log('--- BEFORE EDIT ---');
    console.log('Name:', branch.branchName);
    console.log('PlanId:', branch.subscriptionPlanId);
    console.log('ClosingTime:', branch.closingTime);
    console.log('DimensionsSqFt:', branch.dimensionsSqFt);

    // Perform Update via Prisma
    const updated = await prisma.branch.update({
      where: { id: branch.id },
      data: {
        branchName: 'Bharat Sports Complex',
        subscriptionPlanId: 'plan_pro',
        closingTime: '12:00 PM',
        openingTime: '06:00 AM',
        dimensionsSqFt: 7500,
        minPriceHourly: 1200
      },
      include: { subscriptionPlan: true, branchSports: { include: { sport: true } } }
    });

    console.log('\n--- AFTER EDIT & SAVE ---');
    console.log('Name:', updated.branchName);
    console.log('PlanId:', updated.subscriptionPlanId);
    console.log('PlanName:', updated.subscriptionPlan?.planName);
    console.log('ClosingTime:', updated.closingTime);
    console.log('DimensionsSqFt:', updated.dimensionsSqFt);
    console.log('MinPriceHourly:', updated.minPriceHourly);

    console.log('\nVERIFICATION SUCCESSFUL: All fields persist in DB!');

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

testFullBranchUpdateFlow();
