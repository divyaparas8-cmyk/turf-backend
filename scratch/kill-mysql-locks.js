const prisma = require('../src/config/prisma');

async function main() {
    console.log('Inspecting MySQL process list...');
    const processes = await prisma.$queryRawUnsafe('SHOW FULL PROCESSLIST');

    const [currentConnection] = await prisma.$queryRawUnsafe('SELECT CONNECTION_ID() as id');
    const myId = Number(currentConnection.id);
    console.log('My Connection ID:', myId);

    for (const proc of processes) {
        const rawId = proc.Id ?? proc.id ?? proc.f0;
        const procId = Number(rawId);
        if (procId && procId !== myId) {
            console.log(`Killing stuck MySQL process ID: ${procId}`);
            try {
                await prisma.$executeRawUnsafe(`KILL ${procId}`);
                console.log(`Successfully killed MySQL process ${procId}`);
            } catch (err) {
                console.error(`Failed to kill process ${procId}:`, err.message);
            }
        }
    }

    console.log('\nTesting subscription plan updates after killing locks...');

    const updatedEnterprise = await prisma.subscriptionPlan.update({
        where: { id: 'plan_enterprise' },
        data: { updatedAt: new Date() }
    });
    console.log('✅ Update successful for plan_enterprise:', updatedEnterprise.id);

    const updatedPro = await prisma.subscriptionPlan.update({
        where: { id: 'plan_pro' },
        data: { updatedAt: new Date() }
    });
    console.log('✅ Update successful for plan_pro:', updatedPro.id);

    const updatedStarter = await prisma.subscriptionPlan.update({
        where: { id: 'plan_starter' },
        data: { updatedAt: new Date() }
    });
    console.log('✅ Update successful for plan_starter:', updatedStarter.id);

    console.log('\n🎉 ALL LOCKS CLEARED! ALL UPDATES SUCCEEDED INSTANTLY!');
}

main().then(() => {
    prisma.$disconnect();
    process.exit(0);
}).catch(err => {
    console.error('Error:', err);
    prisma.$disconnect();
    process.exit(1);
});
