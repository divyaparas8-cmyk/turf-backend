const http = require('http');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'sportmatrix_jwt_secret_key_2026';

function testGetBookings() {
  const token = jwt.sign({ id: 'own_001_usr', role: 'OWNER' }, JWT_SECRET, { expiresIn: '1h' });

  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 5005,
      path: '/api/v1/bookings',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
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

async function runTest() {
  const res = await testGetBookings();
  console.log('GET /bookings Status:', res.status);
  if (Array.isArray(res.data?.data)) {
    console.log(`Found ${res.data.data.length} total booking rows:`);
    res.data.data.forEach((b, i) => {
      console.log(`${i + 1}. Code: ${b.bookingCode || b.id} | Name: ${b.customer_name || b.customerName} | Status: ${b.booking_status || b.status} | Amount: ₹${b.amount}`);
    });
  } else {
    console.log('Response:', res.data);
  }
}

runTest();
