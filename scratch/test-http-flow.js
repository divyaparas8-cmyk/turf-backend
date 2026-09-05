const http = require('http');

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

async function testBackendHttpFlow() {
  try {
    // 1. Get branches from server
    console.log('--- 1. FETCHING ALL BRANCHES VIA HTTP ---');
    const getRes = await makeRequest({
      hostname: 'localhost',
      port: 5005,
      path: '/api/v1/branches',
      method: 'GET'
    });
    
    console.log('GET /branches status:', getRes.status);
    const branches = getRes.data?.data?.branches || [];
    console.log(`Found ${branches.length} branches`);
    if (branches.length === 0) return;

    const testBranch = branches[0];
    console.log('Testing with Branch:', testBranch.id, '| Name:', testBranch.branchName);
    console.log('Current Sports:', testBranch.sports);
    console.log('Current Amenities:', testBranch.amenities);

    // 2. Perform PUT update
    console.log('\n--- 2. SENDING PUT UPDATE VIA HTTP ---');
    const editPayload = {
      ...testBranch,
      branchName: testBranch.branchName + ' - EDITED',
      pricePerHour: 1500,
      peakPricePerHour: 2200,
      sports: ['Tennis', 'Football'],
      amenities: ['Drinking Water', 'Locker Room']
    };

    const putRes = await makeRequest({
      hostname: 'localhost',
      port: 5005,
      path: `/api/v1/branches/${testBranch.id}`,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      }
    }, editPayload);

    console.log('PUT /branches/:id status:', putRes.status);
    console.log('PUT returned sports:', putRes.data?.data?.sports);
    console.log('PUT returned amenities:', putRes.data?.data?.amenities);
    console.log('PUT returned name:', putRes.data?.data?.branchName);

    // 3. Re-fetch branch by ID via HTTP
    console.log('\n--- 3. RE-FETCHING BRANCH BY ID VIA HTTP ---');
    const getSingleRes = await makeRequest({
      hostname: 'localhost',
      port: 5005,
      path: `/api/v1/branches/${testBranch.id}`,
      method: 'GET'
    });

    console.log('GET /branches/:id status:', getSingleRes.status);
    console.log('Re-fetched name:', getSingleRes.data?.data?.branchName);
    console.log('Re-fetched sports:', getSingleRes.data?.data?.sports);
    console.log('Re-fetched amenities:', getSingleRes.data?.data?.amenities);

    // 4. Re-fetch all branches list via HTTP
    console.log('\n--- 4. RE-FETCHING ALL BRANCHES VIA HTTP ---');
    const getListRes = await makeRequest({
      hostname: 'localhost',
      port: 5005,
      path: '/api/v1/branches',
      method: 'GET'
    });

    const updatedBranchInList = (getListRes.data?.data?.branches || []).find(b => b.id === testBranch.id);
    console.log('List item name:', updatedBranchInList?.branchName);
    console.log('List item sports:', updatedBranchInList?.sports);
    console.log('List item amenities:', updatedBranchInList?.amenities);

  } catch (err) {
    console.error('HTTP test error:', err.message);
  }
}

testBackendHttpFlow();
