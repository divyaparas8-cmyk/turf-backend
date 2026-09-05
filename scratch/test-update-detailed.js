const prisma = require('../src/config/prisma');

async function testBranchUpdateDetailed() {
  try {
    const id = 'br_1788429432426_14520'; // Bharat BR-8281

    const reqBody = {
      branchName: 'Bharat Arena Updated',
      description: 'New Description Test',
      subscriptionPlanId: 'plan_pro', // Pro Plan
      pricePerHour: 1000,
      peakPricePerHour: 1450,
      openingTime: '07:00 AM',
      closingTime: '12:00 PM',
      turfSize: '6,000 Sq.Ft',
      surfaceType: 'TurfPro Synthetic Arena',
      sports: ['Cricket', 'Football'],
      amenities: ['Floodlights', 'Parking', 'Washroom']
    };

    // Simulate updateBranch logic
    const parseSqFt = (val) => {
      if (val === undefined || val === null || val === '') return 5000;
      if (typeof val === 'number' && !isNaN(val)) return val;
      const clean = String(val).replace(/,/g, '');
      const m = clean.match(/(\d+)/);
      return m ? parseInt(m[1], 10) : 5000;
    };

    const formatTime12h = (timeStr) => {
      if (!timeStr) return '06:00 AM';
      if (typeof timeStr !== 'string') return String(timeStr);
      let clean = timeStr.trim().replace(/o/gi, '0');
      if (clean.toUpperCase().includes('AM') || clean.toUpperCase().includes('PM')) return clean;
      const parts = clean.split(':');
      if (parts.length >= 2) {
        let h = parseInt(parts[0], 10);
        const m = parts[1];
        if (isNaN(h)) return clean;
        const ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12;
        if (h === 0) h = 12;
        const hStr = h < 10 ? `0${h}` : `${h}`;
        return `${hStr}:${m} ${ampm}`;
      }
      return clean;
    };

    let newSnapshotPrice = undefined;
    if (reqBody.subscriptionPlanId) {
      const newPlan = await prisma.subscriptionPlan.findUnique({ where: { id: reqBody.subscriptionPlanId } });
      if (newPlan) {
        newSnapshotPrice = Number(newPlan.monthlyPrice || 0);
      }
    }

    const updated = await prisma.branch.update({
      where: { id },
      data: {
        branchName: reqBody.branchName,
        description: reqBody.description,
        subscriptionPlanId: reqBody.subscriptionPlanId,
        subscriptionPriceSnapshot: newSnapshotPrice,
        planPrice: newSnapshotPrice,
        minPriceHourly: Number(reqBody.pricePerHour),
        openingTime: formatTime12h(reqBody.openingTime),
        closingTime: formatTime12h(reqBody.closingTime),
        dimensionsSqFt: parseSqFt(reqBody.turfSize),
        surfaceType: reqBody.surfaceType,
        amenities: reqBody.amenities
      },
      include: { owner: true, subscriptionPlan: true, branchSports: { include: { sport: true } } }
    });

    console.log('=== UPDATED BRANCH DIRECT FROM DB ===');
    console.log('branchName:', updated.branchName);
    console.log('description:', updated.description);
    console.log('subscriptionPlanId:', updated.subscriptionPlanId);
    console.log('planPrice:', updated.planPrice);
    console.log('minPriceHourly:', updated.minPriceHourly);
    console.log('openingTime:', updated.openingTime);
    console.log('closingTime:', updated.closingTime);
    console.log('dimensionsSqFt:', updated.dimensionsSqFt);

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

testBranchUpdateDetailed();
