const http = require('http');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'sportmatrix_jwt_secret_key_2026';

function makeRequest(options) {
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
    req.end();
  });
}

async function testDashboardAPI() {
  try {
    const token = jwt.sign({ id: 'usr_1788429347395_80754', role: 'OWNER' }, JWT_SECRET, { expiresIn: '1h' });

    console.log('--- FETCHING OWNER DASHBOARD DATA ---');
    const res = await makeRequest({
      hostname: 'localhost',
      port: 5005,
      path: '/api/v1/dashboard/summary',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    console.log('GET /dashboard/summary status:', res.status);
    const recent = res.data?.data?.recentBookings || [];
    console.log(`Found ${recent.length} recent bookings in dashboard:`);
    recent.forEach(b => {
      console.log(`- Customer: ${b.customer} | Amount: ${b.amount} | Status: ${b.status} | Time: ${b.time}`);
    });

  } catch (err) {
    console.error(err);
  }
}

testDashboardAPI();
