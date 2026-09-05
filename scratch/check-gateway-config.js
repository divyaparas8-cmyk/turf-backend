const prisma = require('../src/config/prisma');

async function checkGatewayConfig() {
  try {
    const config = await prisma.paymentGatewayConfig.findUnique({ where: { id: 'global_gateway' } });
    console.log('Payment Gateway Config in DB:', config);
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

checkGatewayConfig();
