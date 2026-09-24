const http = require('http');

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', message: 'Test server running' }));
});

const PORT = 5000;
server.listen(PORT, () => {
    console.log(`✅ TEST SERVER running on port ${PORT}`);
    process.stdout.write('Server is listening\n');
});

server.on('error', (err) => {
    console.error('Server error:', err);
});
