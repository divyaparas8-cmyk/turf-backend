const prisma = require('../src/config/prisma');

async function checkUser() {
  try {
    const user = await prisma.user.findUnique({
      where: { id: 'usr_umpire_01' }
    });
    console.log('=== USER usr_umpire_01 ===');
    console.log(JSON.stringify(user, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

checkUser();
