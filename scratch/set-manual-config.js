const prisma = require('../src/config/prisma');

async function setManualGateway() {
  try {
    const config = await prisma.paymentGatewayConfig.upsert({
      where: { id: 'global_gateway' },
      update: { activeProvider: 'MANUAL' },
      create: {
        id: 'global_gateway',
        activeProvider: 'MANUAL',
        isLiveMode: false
      }
    });
    console.log('Updated PaymentGatewayConfig to MANUAL:', config);
  } catch (e) {
    console.error('Error updating PaymentGatewayConfig:', e);
  } finally {
    await prisma.$disconnect();
  }
}

setManualGateway();
