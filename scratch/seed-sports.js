const prisma = require('../src/config/prisma');

async function seedSports() {
    const defaultSports = [
        { id: 'sp_cricket', name: 'Cricket', icon: '🏏' },
        { id: 'sp_football', name: 'Football', icon: '⚽' },
        { id: 'sp_badminton', name: 'Badminton', icon: '🏸' },
        { id: 'sp_tennis', name: 'Tennis', icon: '🎾' }
    ];

    for (const s of defaultSports) {
        const existing = await prisma.sport.findFirst({ where: { name: s.name } });
        if (!existing) {
            const created = await prisma.sport.create({
                data: {
                    id: s.id,
                    name: s.name,
                    icon: s.icon,
                    category: 'Turf Sport',
                    defaultSlotDuration: 60
                }
            });
            console.log('Seeded master sport:', created);
        } else {
            console.log('Master sport exists:', existing.name);
        }
    }
}

seedSports().then(() => {
    prisma.$disconnect();
    process.exit(0);
}).catch(err => {
    console.error(err);
    prisma.$disconnect();
    process.exit(1);
});
