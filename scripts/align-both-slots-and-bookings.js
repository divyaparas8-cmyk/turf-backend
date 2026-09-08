const prisma = require('../src/config/prisma');

async function alignSlotsAndBookings() {
    console.log('--- Aligning Both Slots & Bookings to Non-Conflicting Realistic Schedule ---');

    const branches = await prisma.branch.findMany();
    const defaultBranchId = branches[0]?.id || 'br_default';
    const sports = await prisma.sport.findMany();
    const cricketSportId = sports.find(s => s.name.toLowerCase().includes('cricket'))?.id || sports[0]?.id;
    const footballSportId = sports.find(s => s.name.toLowerCase().includes('football'))?.id || sports[1]?.id || cricketSportId;

    const bookings = await prisma.booking.findMany({
        include: { slot: true },
        orderBy: { id: 'asc' }
    });

    console.log(`Found ${bookings.length} bookings to align across slots and bookings.`);

    const scheduleList = [
        // Today - 08 Sept 2026
        {
            dateStr: '2026-09-08',
            dateObj: new Date('2026-09-08T00:00:00.000Z'),
            startTime: '17:00:00',
            displayTime: '05:00 PM',
            courtName: 'Court 1',
            sportName: 'Cricket',
            sportId: cricketSportId,
            checkInStatus: 'CHECKED_IN'
        },
        {
            dateStr: '2026-09-08',
            dateObj: new Date('2026-09-08T00:00:00.000Z'),
            startTime: '18:00:00',
            displayTime: '06:00 PM',
            courtName: 'Court 1',
            sportName: 'Cricket',
            sportId: cricketSportId,
            checkInStatus: 'CHECKED_IN'
        },
        {
            dateStr: '2026-09-08',
            dateObj: new Date('2026-09-08T00:00:00.000Z'),
            startTime: '19:00:00',
            displayTime: '07:00 PM',
            courtName: 'Court 1',
            sportName: 'Cricket',
            sportId: cricketSportId,
            checkInStatus: 'PENDING_CHECK_IN'
        },
        {
            dateStr: '2026-09-08',
            dateObj: new Date('2026-09-08T00:00:00.000Z'),
            startTime: '18:00:00',
            displayTime: '06:00 PM',
            courtName: 'Court 2',
            sportName: 'Football',
            sportId: footballSportId,
            checkInStatus: 'PENDING_CHECK_IN'
        },

        // Tomorrow - 09 Sept 2026
        {
            dateStr: '2026-09-09',
            dateObj: new Date('2026-09-09T00:00:00.000Z'),
            startTime: '18:00:00',
            displayTime: '06:00 PM',
            courtName: 'Court 1',
            sportName: 'Cricket',
            sportId: cricketSportId,
            checkInStatus: 'PENDING_CHECK_IN'
        },
        {
            dateStr: '2026-09-09',
            dateObj: new Date('2026-09-09T00:00:00.000Z'),
            startTime: '19:00:00',
            displayTime: '07:00 PM',
            courtName: 'Court 1',
            sportName: 'Cricket',
            sportId: cricketSportId,
            checkInStatus: 'PENDING_CHECK_IN'
        },
        {
            dateStr: '2026-09-09',
            dateObj: new Date('2026-09-09T00:00:00.000Z'),
            startTime: '20:00:00',
            displayTime: '08:00 PM',
            courtName: 'Court 2',
            sportName: 'Football',
            sportId: footballSportId,
            checkInStatus: 'PENDING_CHECK_IN'
        },

        // Day After Tomorrow - 10 Sept 2026
        {
            dateStr: '2026-09-10',
            dateObj: new Date('2026-09-10T00:00:00.000Z'),
            startTime: '18:00:00',
            displayTime: '06:00 PM',
            courtName: 'Court 1',
            sportName: 'Cricket',
            sportId: cricketSportId,
            checkInStatus: 'PENDING_CHECK_IN'
        }
    ];

    for (let i = 0; i < bookings.length; i++) {
        const b = bookings[i];
        const s = scheduleList[i % scheduleList.length];
        const branchId = b.slot?.branchId || defaultBranchId;

        // Upsert a valid Slot for this non-conflicting schedule
        const slotUniqueKey = {
            branchId_courtName_slotDate_startTime: {
                branchId: branchId,
                courtName: s.courtName,
                slotDate: s.dateObj,
                startTime: s.startTime
            }
        };

        let targetSlot = await prisma.slot.findUnique({
            where: slotUniqueKey
        });

        if (!targetSlot) {
            targetSlot = await prisma.slot.create({
                data: {
                    id: `slot_${Date.now()}_${Math.floor(Math.random()*10000)}_${i}`,
                    branchId: branchId,
                    sportId: s.sportId,
                    courtName: s.courtName,
                    slotDate: s.dateObj,
                    startTime: s.startTime,
                    endTime: (parseInt(s.startTime.split(':')[0]) + 1).toString().padStart(2, '0') + ':00:00',
                    duration: 60,
                    regularPrice: b.amount,
                    status: 'BOOKED'
                }
            });
        } else {
            await prisma.slot.update({
                where: { id: targetSlot.id },
                data: {
                    status: 'BOOKED',
                    sportId: s.sportId
                }
            });
        }

        // Update the booking to link directly to this slot
        await prisma.booking.update({
            where: { id: b.id },
            data: {
                slotId: targetSlot.id,
                dutyDate: s.dateObj,
                timeSlot: s.displayTime,
                courtName: s.courtName,
                sportName: s.sportName,
                checkInStatus: s.checkInStatus,
                checkedInAt: s.checkInStatus === 'CHECKED_IN' ? new Date('2026-09-08T11:00:00.000Z') : null,
                status: 'COMPLETED'
            }
        });

        console.log(`[Synced] Booking #${b.id} (${b.bookingCode || 'BK'}) -> Slot: ${targetSlot.id} | Date: ${s.dateStr} | Time: ${s.displayTime} | Court: ${s.courtName} | Status: ${s.checkInStatus}`);
    }

    console.log('--- ALL SLOTS AND BOOKINGS PERFECTLY ALIGNED ---');
    await prisma.$disconnect();
}

alignSlotsAndBookings().catch(err => {
    console.error('Error during alignment:', err);
    process.exit(1);
});
