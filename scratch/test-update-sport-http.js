const http = require('http');
const jwt = require('jsonwebtoken');

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

async function testUpdateSport() {
  try {
    const token = jwt.sign({ id: 'usr_1788429347395_80754', role: 'OWNER' }, JWT_SECRET, { expiresIn: '1h' });

    console.log('--- 1. FETCHING BRANCH SPORTS ---');
    const getRes = await makeRequest({
      hostname: 'localhost',
      port: 5005,
      path: '/api/v1/sports/branch/br_1788429432426_14520',
      method: 'GET'
    });

    console.log('GET /sports/branch status:', getRes.status);
    const sports = getRes.data?.data || getRes.data || [];
    console.log(`Found ${sports.length} sports for branch`);
    if (sports.length === 0) return;

    const testSport = sports[0];
    const sportId = testSport.id || testSport._id;
    console.log('Test Sport ID:', sportId, '| Name:', testSport.name || testSport.sportId?.name);
    console.log('Current Regular Price:', testSport.regularPrice, '| Peak Price:', testSport.peakPrice);

    // 2. Perform PUT update on branch sport
    console.log('\n--- 2. SENDING PUT UPDATE FOR BRANCH SPORT ---');
    const updatePayload = {
      regularPrice: 800,
      peakPrice: 2100,
      totalCourts: 2,
      openingTime: '06:00',
      closingTime: '23:00',
      slotDuration: 60
    };

    const putRes = await makeRequest({
      hostname: 'localhost',
      port: 5005,
      path: `/api/v1/sports/branch/${sportId}`,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    }, updatePayload);

    console.log('PUT /sports/branch/:id status:', putRes.status);
    console.log('PUT Response:', JSON.stringify(putRes.data, null, 2));

    // 3. Re-fetch branch sports
    console.log('\n--- 3. RE-FETCHING BRANCH SPORTS ---');
    const getRes2 = await makeRequest({
      hostname: 'localhost',
      port: 5005,
      path: '/api/v1/sports/branch/br_1788429432426_14520',
      method: 'GET'
    });

    const updatedSport = (getRes2.data?.data || []).find(s => (s.id || s._id) === sportId);
    console.log('Re-fetched Regular Price:', updatedSport?.regularPrice);
    console.log('Re-fetched Peak Price:', updatedSport?.peakPrice);

  } catch (err) {
    console.error(err);
  }
}

testUpdateSport();
