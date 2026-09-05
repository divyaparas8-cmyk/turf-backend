const prisma = require('../src/config/prisma');

async function verifyPrismaSetup() {
  console.log('\n=============================================================');
  console.log('       SPORTMATRIX PRISMA DATABASE VERIFICATION REPORT       ');
  console.log('=============================================================\n');

  // List of all expected models across all modules
  const expectedModels = [
    'user',
    'owner',
    'subscriptionPlan',
    'ownerSubscription',
    'branch',
    'branchMedia',
    'sport',
    'branchSport',
    'slot',
    'slotHold',
    'booking',
    'match',
    'matchTeam',
    'matchPayment',
    'matchHandshake',
    'umpireProfile',
    'umpireDutyAssignment',
    'scorecard',
    'tournamentCategory',
    'tournament',
    'tournamentTeam',
    'tournamentPlayer',
    'fixture',
    'tournamentLeaderboard',
    'tournamentSponsor',
    'tournamentPayment',
    'tournamentSetting',
    'posOrder',
    'posOrderItem',
    'clubTeam',
    'clubPlayer',
    'teamMembershipRequest',
    'playerProfile',
    'playerScoreSubmission',
    'offerEarningAlert',
    'inventory',
    'purchaseEntry',
    'equipmentRental',
    'refundRequest',
    'maintenanceTask',
    'staffMember',
    'advertisement',
    'adCommission',
    'adPayment',
    'discountOffer',
    'crmLead',
    'corporateBooking',
    'payment',
    'dispute',
    'wallet',
    'walletTransaction',
    'systemSetting',
    'activityLog',
    'holiday',
    'review',
    'contactMessage',
    'guestBooking',
    'liveMatchSession'
  ];

  console.log(`📊 Checking Model Delegates (${expectedModels.length} Models total):`);
  let loadedCount = 0;
  
  for (const model of expectedModels) {
    if (prisma[model]) {
      loadedCount++;
      console.log(`  ✅ prisma.${model.padEnd(25)} [Ready & Accessible]`);
    } else {
      console.log(`  ❌ prisma.${model.padEnd(25)} [MISSING]`);
    }
  }

  console.log(`\n📈 Summary: ${loadedCount} / ${expectedModels.length} models are fully recognized by Prisma Client!`);

  console.log('\n🔌 Testing Database Connection & Health...');
  try {
    // Try to query raw MySQL version or user count
    await prisma.$queryRaw`SELECT 1 as health_check`;
    console.log('  ✅ MySQL Database Connection: ONLINE & READY');
    
    // Sample counts
    const userCount = await prisma.user.count().catch(() => 0);
    const branchCount = await prisma.branch.count().catch(() => 0);
    const bookingCount = await prisma.booking.count().catch(() => 0);
    
    console.log(`  📌 Users in DB: ${userCount}`);
    console.log(`  📌 Branches in DB: ${branchCount}`);
    console.log(`  📌 Bookings in DB: ${bookingCount}`);
  } catch (err) {
    console.log('  ⚠️ Database Connection Note:');
    console.log(`     ${err.message.split('\n')[0]}`);
    console.log('     👉 Note: Make sure MySQL server (XAMPP/MySQL) is running on port 3306 and run: npx prisma db push');
  }

  console.log('\n=============================================================');
  console.log('                 VERIFICATION REPORT FINISHED                ');
  console.log('=============================================================\n');
}

verifyPrismaSetup()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
