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

async function debug500Error() {
  try {
    const getRes = await makeRequest({
      hostname: 'localhost',
      port: 5005,
      path: '/api/v1/branches',
      method: 'GET'
    });
    
    const testBranch = getRes.data?.data?.branches?.[0];
    if (!testBranch) {
      console.log('No branch found');
      return;
    }

    console.log('Sending PUT update for branch:', testBranch.id);
    const editPayload = {
      ...testBranch,
      branchName: testBranch.branchName + ' - EDITED',
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

    console.log('PUT Status Code:', putRes.status);
    console.log('PUT Response Body:', JSON.stringify(putRes.data, null, 2));

  } catch (err) {
    console.error(err);
  }
}

debug500Error();
