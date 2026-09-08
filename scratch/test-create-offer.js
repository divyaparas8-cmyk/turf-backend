const prisma = require('../src/config/prisma');
const fs = require('fs');
const path = require('path');

const saveBase64Image = (base64Str, prefix = 'offer') => {
    if (!base64Str || typeof base64Str !== 'string' || !base64Str.startsWith('data:image/')) {
        return base64Str || '';
    }
    try {
        const matches = base64Str.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) return '';
        const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
        const data = Buffer.from(matches[2], 'base64');
        const filename = `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}.${ext}`;
        const uploadsDir = path.join(__dirname, '../public/uploads');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }
        fs.writeFileSync(path.join(uploadsDir, filename), data);
        return `/uploads/${filename}`;
    } catch (err) {
        console.error('Failed to save base64 image:', err);
        return '';
    }
};

async function testCreateOfferWithBase64() {
    console.log('Testing DiscountOffer creation with Base64 image payload...');
    const branches = await prisma.branch.findMany({ take: 1 });
    if (!branches.length) {
        console.log('No branches found');
        return;
    }
    const branch = branches[0];

    // Create a 10KB fake base64 image string
    const sampleBase64 = 'data:image/png;base64,' + 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='.repeat(100);
    
    const banner = saveBase64Image(sampleBase64, 'banner');
    const thumbnail = saveBase64Image(sampleBase64, 'thumb');

    console.log('Saved banner URL:', banner);
    console.log('Saved thumbnail URL:', thumbnail);

    const offer = await prisma.discountOffer.create({
        data: {
            id: `disc_b64_${Date.now()}`,
            branchId: branch.id,
            ownerId: branch.ownerId || null,
            title: 'Base64 Image Test Offer',
            description: 'Testing Base64 image disk conversion',
            discountType: 'PERCENTAGE',
            discountValue: 25,
            minimumBookingAmount: 500,
            maximumDiscountAmount: 200,
            promoCode: `B64_${Math.floor(1000 + Math.random() * 9000)}`,
            banner,
            thumbnail,
            applicableSports: ['Football', 'Cricket'],
            applicableDays: ['Monday', 'Tuesday'],
            applicableSlotTypes: ['Regular Hours'],
            startDate: new Date(),
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            startTime: '06:00:00',
            endTime: '23:00:00',
            usageLimit: 100,
            perUserLimit: 2,
            firstBookingOnly: false,
            stackable: false,
            autoApply: false,
            targetRadiusKm: 5.0,
            locationArea: branch.city || 'Ujjain',
            genderSegment: 'All Genders',
            ageGroup: 'All Ages',
            customerType: 'All Users',
            estimatedAudience: 5000,
            status: 'ACTIVE',
            createdBy: 'TEST_SCRIPT'
        }
    });

    console.log('Successfully created offer with image:', offer.id, offer.title, offer.banner);

    // Clean up test offer
    await prisma.discountOffer.delete({ where: { id: offer.id } });
    console.log('Cleaned up test offer.');
}

testCreateOfferWithBase64()
    .then(() => {
        prisma.$disconnect();
        process.exit(0);
    })
    .catch(err => {
        console.error('Test offer creation failed:', err);
        prisma.$disconnect();
        process.exit(1);
    });
