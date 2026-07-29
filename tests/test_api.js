const http = require('http');

const PORT = 3001;
let passed = 0;
let total = 0;

function assert(condition, message) {
  total++;
  if (!condition) throw new Error(message);
  passed++;
  console.log(`[PASS] ${message}`);
}

function request(method, route, payload) {
  const body = payload ? JSON.stringify(payload) : '';
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '127.0.0.1',
      port: PORT,
      path: route,
      method,
      timeout: 120000,
      headers: payload ? {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      } : {}
    }, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ statusCode: res.statusCode, body: JSON.parse(data) });
        } catch (err) {
          reject(new Error(`Invalid JSON from ${method} ${route}: ${err.message}`));
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`${method} ${route} timed out`));
    });
    if (body) req.write(body);
    req.end();
  });
}

async function run() {
  const health = await request('GET', '/health');
  assert(health.statusCode === 200, '/health returns 200');
  assert(health.body.ok === true, '/health returns ok true');

  const status = await request('GET', '/api/status');
  assert(status.statusCode === 200, '/api/status returns 200');
  assert(['demo', 'real'].includes(status.body.mode), '/api/status returns demo or real');
  assert(typeof status.body.active_model === 'string', '/api/status returns active_model');
  assert(typeof status.body.llm_server_running === 'boolean', '/api/status returns llm_server_running');
  assert(typeof status.body.kiwix_running === 'boolean', '/api/status returns kiwix_running');
  assert(Array.isArray(status.body.kiwix_zim_files), '/api/status returns kiwix_zim_files array');

  const models = await request('GET', '/api/models');
  assert(models.statusCode === 200, '/api/models returns 200');
  assert(Array.isArray(models.body.models) && models.body.models.length === 3, '/api/models returns three models');

  const medical = await request('POST', '/api/chat', {
    message: 'How do I treat a minor burn?'
  });
  assert(medical.statusCode === 200, '/api/chat medical returns 200');
  assert(typeof medical.body.reply === 'string' && medical.body.reply.length > 0, '/api/chat medical returns reply');
  assert(medical.body.is_medical === true, '/api/chat medical sets is_medical');
  assert(typeof medical.body.medical_disclaimer === 'string', '/api/chat medical returns disclaimer');

  const tech = await request('POST', '/api/chat', {
    message: 'Explain TCP handshake'
  });
  assert(tech.statusCode === 200, '/api/chat technical returns 200');
  assert(typeof tech.body.reply === 'string' && tech.body.reply.length > 0, '/api/chat technical returns reply');
  assert(tech.body.is_medical === false, '/api/chat technical is not medical');

  console.log(`API tests passed: ${passed}/${total}`);
}

run().then(() => process.exit(0)).catch(err => {
  console.error(`[FAIL] ${err.message}`);
  console.error('Start the server first with: node server/index.js');
  process.exit(1);
});
