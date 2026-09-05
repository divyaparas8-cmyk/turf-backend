const prisma = require('../src/config/prisma');

async function testTeamsCount() {
    const teams = await prisma.tournamentTeam.findMany({
        include: { tournament: true }
    });
    console.log('Total TournamentTeam rows in DB:', teams.length);
    teams.forEach(tm => {
        console.log(`- Team ID: ${tm.id}, Name: ${tm.teamName}, Captain: ${tm.captainName}, Status: ${tm.status}, Tournament: ${tm.tournament?.title}`);
    });

    const totalTeams = await prisma.tournamentTeam.count();
    console.log('DB Count of TournamentTeam:', totalTeams);

    await prisma.$disconnect();
}

testTeamsCount().catch(err => {
    console.error(err);
    process.exit(1);
});
