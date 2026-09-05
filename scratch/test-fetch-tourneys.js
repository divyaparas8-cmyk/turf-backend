const http = require('http');

http.get('http://127.0.0.1:5005/api/v1/tournaments', (res) => {
    let data = '';
    res.on('data', chunk => { data += chunk; });
    res.on('end', () => {
        console.log('Status code:', res.statusCode);
        console.log('Response body:', data);
    });
}).on('error', err => {
    console.error('HTTP GET Error:', err.message);
});
