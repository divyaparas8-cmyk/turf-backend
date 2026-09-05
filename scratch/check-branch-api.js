const prisma = require('../src/config/prisma');

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

const formatBranch = (b) => {
    const activeSports = (b.branchSports || []).filter(bs => bs.status === 'ACTIVE');
    const sports = (b.branchSports || []).map(bs => ({
        id: bs.id,
        name: bs.sport?.name || bs.name
    }));

    const mainOffer = (b.discountOffers || []).find(d => d.status === 'ACTIVE') || (b.discountOffers || [])[0];

    return {
        id: b.id,
        branchName: b.branchName,
        discountOffer: mainOffer?.title || '',
        couponCode: mainOffer?.promoCode || '',
        sports: sports
    };
};

async function testApi() {
    const branch = await prisma.branch.findUnique({
        where: { id: 'br_1788263947145_16239' },
        include: { owner: { include: { user: true } }, ownerUser: true, subscriptionPlan: true, branchSports: { include: { sport: true } }, discountOffers: true }
    });
    console.log('API Formatted Branch:', formatBranch(branch));
}

testApi().then(() => {
    prisma.$disconnect();
    process.exit(0);
}).catch(err => {
    console.error(err);
    prisma.$disconnect();
    process.exit(1);
});
