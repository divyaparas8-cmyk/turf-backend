const http = require('http');
const jwt = require('jsonwebtoken');
const prisma = require('../src/config/prisma');

const JWT_SECRET = process.env.JWT_SECRET || 'sportmatrix_jwt_secret_key_2026';

function makeRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function testConfirmCommission() {
  try {
    const pendingPayment = await prisma.matchPayment.findFirst({
      where: { commissionStatus: 'PENDING' }
    });

    if (!pendingPayment) {
      console.log('No pending commission payment found in DB.');
      return;
    }

    console.log('Testing confirm commission for Payment ID:', pendingPayment.id, '| Amount:', pendingPayment.commissionAmount);

    const token = jwt.sign({ id: 'own_001_usr', role: 'SUPER_ADMIN' }, JWT_SECRET, { expiresIn: '1h' });

    const confirmRes = await makeRequest({
      hostname: 'localhost',
      port: 5005,
      path: `/api/v1/match-payments/payments/${pendingPayment.id}/confirm-commission`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }, {});

    console.log('Confirm Commission API Status:', confirmRes.status);
    console.log('Confirm Response:', JSON.stringify(confirmRes.data, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

testConfirmCommission();
