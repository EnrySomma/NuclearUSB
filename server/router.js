const handlers = require('./handlers');
const { serveStatic } = require('./static');

function route(req, res, ctx) {
  const url = req.url.split('?')[0];
  const method = req.method.toUpperCase();

  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400'
    });
    res.end();
    return;
  }

  if (url === '/health' && method === 'GET') {
    return handlers.handleHealth(req, res, ctx);
  }

  if (url.startsWith('/api/')) {
    return routeAPI(req, res, ctx, url, method);
  }

  return serveStatic(req, res, ctx.uiDir);
}

function routeAPI(req, res, ctx, url, method) {
  if (url === '/api/status' && method === 'GET') return handlers.handleStatus(req, res, ctx);
  if (url === '/api/models' && method === 'GET') return handlers.handleModels(req, res, ctx);
  if (url === '/api/switch-model' && method === 'POST') return handlers.handleSwitchModel(req, res, ctx);
  if (url === '/api/chat' && method === 'POST') return handlers.handleChat(req, res, ctx);
  if (url === '/api/update-prompt' && method === 'POST') return handlers.handleUpdatePrompt(req, res, ctx);
  if (url === '/api/shutdown' && method === 'POST') return handlers.handleShutdown(req, res, ctx);

  handlers.sendJSON(res, {
    error: 'Not Found',
    message: `Unknown API endpoint: ${method} ${url}`,
    available: ['GET /api/status', 'GET /health', 'GET /api/models', 'POST /api/switch-model', 'POST /api/chat', 'POST /api/update-prompt', 'POST /api/shutdown']
  }, 404);
}

module.exports = { route };
