async function testHttpGet() {
    const res = await fetch('http://localhost:5005/api/v1/branches/br_1788263947145_16239');
    const json = await res.json();
    console.log('HTTP GET Branch Response:', json);
}

testHttpGet().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
});
