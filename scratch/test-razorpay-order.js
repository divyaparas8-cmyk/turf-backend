const http = require('http');

const data = JSON.stringify({
    teamName: 'Test Squad',
    captainName: 'Aman',
    captainMobile: '9876543210',
    captainEmail: 'a@gmail.com'
});

const req = http.request('http://127.0.0.1:5005/api/v1/tournaments/t_1788590436647_66059/create-razorpay-order', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
}, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
        console.log('Status code:', res.statusCode);
        console.log('Response body:', body);
    });
});

req.on('error', err => console.error(err));
req.write(data);
req.end();
