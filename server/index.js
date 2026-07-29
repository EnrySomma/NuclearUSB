#!/usr/bin/env node

const http = require('http');
const net = require('net');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { route } = require('./router');
const llmClient = require('./llm-client');

const PROJECT_ROOT = path.resolve(path.join(__dirname, '..'));
const DOWNLOADS_ROOT = path.join(PROJECT_ROOT, 'downloads');
const WINDOWS_LLM_DIR = path.join(DOWNLOADS_ROOT, 'runtime', 'llm', 'win');
const WINDOWS_KIWIX_DIR = path.join(DOWNLOADS_ROOT, 'runtime', 'kiwix', 'win');
const CONFIG_DIR = path.join(PROJECT_ROOT, 'config');
const UI_DIR = path.join(PROJECT_ROOT, 'ui');

function loadJSON(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    console.error(`[NuclearUSB] Failed to load ${filePath}: ${err.message}`);
    return null;
  }
}

const DEFAULT_APP = {
  app_name: 'NuclearUSB', version: '0.1.0', current_target: 'Windows 10/11 x64',
  default_model: 'fast',
  medical_keywords: ['burn','wound','bleeding','fracture','cpr','poison','fever','infection',
    'bandage','first aid','choking','shock','allergy','medication','dosage','symptom',
    'injury','emergency','breathing','pulse'],
  demo_mode_label: 'DEMO', real_mode_label: 'LOCAL AI',
  medical_disclaimer: 'Questo sistema fornisce informazioni di primo riferimento. Non sostituisce un medico. In caso di emergenza chiama il 118 o il 112.'
};
const DEFAULT_MODELS = { models: [
  { id: 'fast', name: 'Phi-3.5-mini-instruct', path: 'downloads/models/fast/Phi-3.5-mini-instruct-Q4_K_M.gguf', ctx_size: 4096, gpu_layers: 0, description: 'Fast local chat model' },
  { id: 'power', name: 'Gemma 4 Obliterated', path: 'downloads/models/power/Gemma-4-12B-OBLITERATED-Q4_K_M.gguf', ctx_size: 8192, gpu_layers: 0, description: 'General-purpose model' },
  { id: 'coding', name: 'Gemma 4 Coder', path: 'downloads/models/coding/gemma4-coding-Q4_K_M.gguf', ctx_size: 8192, gpu_layers: 0, description: 'Coding-focused model' }
]};
const DEFAULT_PORTS = { api_server: 3001, llm_server: 8080, kiwix_server: 8081 };
const MAX_API_PORT_ATTEMPTS = 20;

const configApp = loadJSON(path.join(CONFIG_DIR, 'app.json')) || DEFAULT_APP;
const configModels = loadJSON(path.join(CONFIG_DIR, 'models.json')) || DEFAULT_MODELS;
const configPorts = loadJSON(path.join(CONFIG_DIR, 'ports.json')) || DEFAULT_PORTS;

function apiPort() {
  return configPorts.api_server || 3001;
}

function llmPort() {
  return configPorts.llm_server || 8080;
}

function kiwixPort() {
  return configPorts.kiwix_server || 8081;
}

function isPortAvailable(port) {
  return new Promise(resolve => {
    const probe = net.createServer();
    probe.once('error', () => resolve(false));
    probe.once('listening', () => probe.close(() => resolve(true)));
    probe.listen(port, '127.0.0.1');
  });
}

async function findAvailablePort(startPort, attempts = MAX_API_PORT_ATTEMPTS) {
  for (let offset = 0; offset <= attempts; offset++) {
    const candidate = startPort + offset;
    if (candidate === apiPort() || candidate === kiwixPort()) continue;
    if (await isPortAvailable(candidate)) return candidate;
  }
  throw new Error(`No free port found starting at ${startPort}.`);
}

function activeModelConfig(state) {
  return configModels.models.find(model => model.id === state.active_model) || configModels.models[0];
}

function modelExists(model) {
  return Boolean(model && fs.existsSync(path.join(PROJECT_ROOT, model.path)));
}

function zimFiles() {
  const roots = [
    path.join(DOWNLOADS_ROOT, 'wikipedia')
  ];
  const found = [];

  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    for (const file of fs.readdirSync(root)) {
      if (file.toLowerCase().endsWith('.zim')) {
        found.push(path.join(root, file));
      }
    }
  }

  return found;
}

function zimFilenames(state) {
  const files = state && Array.isArray(state.kiwix_zim_files) ? state.kiwix_zim_files : zimFiles();
  return files.map(file => path.basename(file));
}

function canUseRealMode(state) {
  const model = activeModelConfig(state);
  const llamaServer = path.join(WINDOWS_LLM_DIR, 'llama-server.exe');
  return fs.existsSync(llamaServer) && modelExists(model);
}

function refreshMode(state) {
  state.mode = canUseRealMode(state) ? 'real' : 'demo';
}

function waitForLlamaReady(state, child, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise(resolve => {
    const poll = async () => {
      if (!llmClient.processAlive(state) || state.llm_process !== child) {
        resolve(false);
        return;
      }
      if (await llmClient.basicHealthCheck(llmPort(), '/health', 1000)) {
        resolve(true);
        return;
      }
      if (Date.now() >= deadline) {
        resolve(false);
        return;
      }
      setTimeout(poll, 250);
    };
    poll();
  });
}

function spawnLlamaServer(state) {
  const model = activeModelConfig(state);
  const llamaServer = path.join(WINDOWS_LLM_DIR, 'llama-server.exe');
  const modelPath = path.join(PROJECT_ROOT, model.path);

  if (!canUseRealMode(state)) return Promise.resolve(false);
  if (state.llm_external) return Promise.resolve(true);
  if (state.llm_process && !state.llm_process.killed) return state.llm_startup || Promise.resolve(true);

  const args = [
    '--model', modelPath,
    '--port', String(llmPort()),
    '--ctx-size', String(model.ctx_size),
    '--n-gpu-layers', String(model.gpu_layers || 0)
  ];

  console.log(`[NuclearUSB] Starting llama-server.exe for ${model.id} on port ${llmPort()}...`);
  const env = { ...process.env, PATH: `${WINDOWS_LLM_DIR};${process.env.PATH || ''}` };
  const child = spawn(llamaServer, args, { cwd: WINDOWS_LLM_DIR, env, windowsHide: true });

  child.stdout.on('data', data => {
    const text = data.toString().trim();
    if (text) console.log(`[llama-server] ${text}`);
  });
  child.stderr.on('data', data => {
    const text = data.toString().trim();
    if (text) console.warn(`[llama-server] ${text}`);
  });
  child.on('exit', code => {
    console.warn(`[NuclearUSB] llama-server exited with code ${code}.`);
    state.llm_process = null;
  });
  child.on('error', err => {
    console.warn(`[NuclearUSB] Failed to start llama-server: ${err.message}`);
    state.llm_process = null;
  });

  state.llm_process = child;
  state.llm_startup = waitForLlamaReady(state, child);
  state.llm_startup.then(ready => {
    if (!ready && state.llm_process === child) {
      console.warn(`[NuclearUSB] llama-server for ${model.id} did not become ready in time.`);
    }
    if (state.llm_process === child) state.llm_startup = null;
  });
  return state.llm_startup;
}

function stopLlamaServer(state) {
  const existing = state.llm_process;
  if (!existing || existing.killed) return Promise.resolve();

  return new Promise(resolve => {
    let stopped = false;
    const finish = () => {
      if (stopped) return;
      stopped = true;
      state.llm_process = null;
      state.llm_startup = null;
      resolve();
    };
    existing.once('exit', finish);
    existing.once('error', finish);
    try {
      existing.kill('SIGTERM');
    } catch (err) {
      finish();
    }
    setTimeout(() => {
      if (!stopped) {
        try { existing.kill(); } catch { /* process already exited */ }
        finish();
      }
    }, 5000).unref();
  });
}

function restartLlamaServer(state) {
  if (state.llm_transition) return state.llm_transition;

  state.llm_transition = (async () => {
    if (state.llm_external) {
      // An external llama-server cannot be stopped safely. Move this app to
      // a free LLM port and start the selected model there instead of sending
      // requests to the previous model while reporting a false switch.
      state.llm_external = false;
      configPorts.llm_server = await findAvailablePort(llmPort() + 1);
    } else {
      await stopLlamaServer(state);
    }
    return spawnLlamaServer(state);
  })();
  state.llm_transition = state.llm_transition.then(result => {
    state.llm_transition = null;
    return result;
  }, err => {
    state.llm_transition = null;
    console.warn(`[NuclearUSB] Model restart failed: ${err.message}`);
    return false;
  });
  return state.llm_transition;
}

async function ensureLlamaReady(state) {
  if (state.llm_transition) await state.llm_transition;
  if (state.llm_startup) {
    const ready = await state.llm_startup;
    if (!ready) return false;
  }
  // A live owned or external process is considered usable even if its HTTP
  // health endpoint is temporarily busy serving another request.
  if (state.llm_external || llmClient.processAlive(state)) return true;
  return llmClient.healthCheck(llmPort());
}

function spawnKiwixServer(state) {
  const kiwixServe = path.join(WINDOWS_KIWIX_DIR, 'kiwix-serve.exe');
  const zims = zimFiles();
  state.kiwix_zim_files = zims;

  if (zims.length === 0) {
    console.log('[NuclearUSB] No ZIM files found. Kiwix integration disabled.');
    state.kiwix_running = false;
    return;
  }

  console.log(`[NuclearUSB] Kiwix ZIM files loaded: ${zimFilenames(state).join(', ')}`);

  if (!fs.existsSync(kiwixServe)) {
    console.warn(`[NuclearUSB] kiwix-serve.exe not found at ${kiwixServe}. Kiwix integration disabled.`);
    state.kiwix_running = false;
    return;
  }
  if (state.kiwix_external) {
    state.kiwix_running = true;
    return;
  }
  if (state.kiwix_process && !state.kiwix_process.killed) {
    state.kiwix_running = true;
    return;
  }

  console.log(`[NuclearUSB] Starting kiwix-serve.exe on port ${kiwixPort()}...`);
  const child = spawn(kiwixServe, ['--port', String(kiwixPort()), ...zims], {
    cwd: WINDOWS_KIWIX_DIR,
    windowsHide: true
  });

  child.stdout.on('data', data => {
    const text = data.toString().trim();
    if (text) console.log(`[kiwix] ${text}`);
  });
  child.stderr.on('data', data => {
    const text = data.toString().trim();
    if (text) console.warn(`[kiwix] ${text}`);
  });
  child.on('exit', code => {
    console.warn(`[NuclearUSB] kiwix-serve exited with code ${code}.`);
    state.kiwix_process = null;
    state.kiwix_running = false;
  });
  child.on('error', err => {
    console.warn(`[NuclearUSB] Failed to start kiwix-serve: ${err.message}`);
    state.kiwix_process = null;
    state.kiwix_running = false;
  });

  state.kiwix_process = child;
  state.kiwix_running = true;
}

const state = {
  active_model: configApp.default_model || 'fast',
  api_port: apiPort(),
  mode: 'demo',
  llm_process: null,
  llm_external: false,
  kiwix_process: null,
  kiwix_external: false,
  kiwix_running: false,
  kiwix_zim_files: []
};

refreshMode(state);

const ctx = {
  config: { app: configApp, models: configModels, ports: configPorts },
  state,
  projectRoot: PROJECT_ROOT,
  downloadsRoot: DOWNLOADS_ROOT,
  uiDir: UI_DIR,
  helpers: {
    activeModelConfig: () => activeModelConfig(state),
    modelExists,
    refreshMode: () => refreshMode(state),
    spawnLlamaServer: () => spawnLlamaServer(state),
    restartLlamaServer: () => restartLlamaServer(state),
    ensureLlmReady: () => ensureLlamaReady(state),
    waitForLlmTransition: async () => {
      if (state.llm_transition) await state.llm_transition;
    },
    llmHealth: () => llmClient.healthCheck(llmPort()),
    kiwixHealth: async () => {
      const processRunning = Boolean(state.kiwix_process && !state.kiwix_process.killed);
      const healthy = await llmClient.basicHealthCheck(kiwixPort(), '/');
      state.kiwix_running = processRunning || healthy;
      return state.kiwix_running;
    },
    kiwixZimFiles: () => zimFilenames(state)
  }
};

const server = http.createServer((req, res) => {
  const start = Date.now();
  res.on('finish', () => {
    if (req.url.startsWith('/api/') || req.url === '/health') {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} ${res.statusCode} (${Date.now() - start}ms)`);
    }
  });

  try {
    Promise.resolve(route(req, res, ctx)).catch((err) => {
      handleRequestError(res, err);
    });
  } catch (err) {
    handleRequestError(res, err);
  }
});

function handleRequestError(res, err) {
    console.error(`[NuclearUSB] Unhandled error: ${err.message}`);
    if (res.headersSent) {
      res.end();
      return;
    }
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: false, error: 'Internal Server Error' }));
}
ctx.server = server;

function listenOnAvailablePort(port, attempts = 0) {
  return new Promise((resolve, reject) => {
    const onListening = () => {
      server.removeListener('error', onError);
      state.api_port = port;
      configPorts.api_server = port;
      resolve(port);
    };

    const onError = (err) => {
      server.removeListener('listening', onListening);
      if (err.code === 'EADDRINUSE' && attempts < MAX_API_PORT_ATTEMPTS) {
        const nextPort = port + 1;
        console.warn(`[NuclearUSB] Port ${port} is already in use; trying ${nextPort}.`);
        setTimeout(() => listenOnAvailablePort(nextPort, attempts + 1).then(resolve, reject), 50);
        return;
      }
      reject(err);
    };

    server.once('listening', onListening);
    server.once('error', onError);
    server.listen(port, '127.0.0.1');
  });
}

function printStartupBanner(port) {
  console.log('');
  console.log('=======================================================');
  console.log('NuclearUSB Windows Offline AI Suite');
  console.log(`Target: Windows x64 | API: http://localhost:${port}`);
  console.log(`Mode: ${state.mode.toUpperCase()} | Active model: ${state.active_model}`);
  console.log(`Kiwix Wikipedia: ${state.kiwix_running ? 'RUNNING' : 'OFF'} | ZIM files: ${zimFilenames(state).length}`);
  console.log('=======================================================');
  console.log('');
}

function openBrowser(port) {
  if (process.env.NUCLEARUSB_OPEN_BROWSER !== '1' || process.platform !== 'win32') return;

  const url = `http://localhost:${port}`;
  const chromeCandidates = [
    path.join(process.env.PROGRAMFILES || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join(process.env['PROGRAMFILES(X86)'] || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'Application', 'chrome.exe')
  ];
  const chrome = chromeCandidates.find(candidate => candidate && fs.existsSync(candidate));

  try {
    if (chrome) {
      spawn(chrome, [url], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
      console.log(`[NuclearUSB] Opened Google Chrome at ${url}.`);
    } else {
      // Use the Windows default browser when Chrome is not installed.
      spawn('cmd.exe', ['/c', 'start', '', url], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
      console.log(`[NuclearUSB] Opened the default browser at ${url}.`);
    }
  } catch (err) {
    console.warn(`[NuclearUSB] Could not open the browser automatically: ${err.message}`);
    console.warn(`[NuclearUSB] Open ${url} manually.`);
  }
}

let shuttingDown = false;
function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log('\n[NuclearUSB] Shutting down...');
  if (state.llm_process && !state.llm_process.killed) state.llm_process.kill('SIGTERM');
  if (state.kiwix_process && !state.kiwix_process.killed) state.kiwix_process.kill('SIGTERM');
  state.kiwix_running = false;
  if (!server.listening) {
    process.exit(exitCode);
    return;
  }
  server.close(() => process.exit(exitCode));
  setTimeout(() => process.exit(exitCode), 1500).unref();
}

async function startOptionalServices() {
  // Reuse an existing server only when it reports the exact model requested
  // by this instance. A server running another model must not make a later
  // model switch appear successful while still answering with stale state.
  const configuredLlmPort = llmPort();
  const existingHealthy = await llmClient.basicHealthCheck(configuredLlmPort, '/health', 1500);
  const loadedModel = existingHealthy ? await llmClient.modelInfo(configuredLlmPort) : null;
  if (existingHealthy && llmClient.modelMatches(loadedModel, activeModelConfig(state))) {
    state.llm_external = true;
    console.log(`[NuclearUSB] Reusing existing llama-server on port ${configuredLlmPort} (${loadedModel}).`);
  } else {
    if (!await isPortAvailable(configuredLlmPort)) {
      const reason = existingHealthy
        ? `it serves ${loadedModel || 'an unknown model'}`
        : 'it is occupied or not responding';
      configPorts.llm_server = await findAvailablePort(configuredLlmPort + 1);
      console.warn(`[NuclearUSB] LLM port ${configuredLlmPort} is unavailable because ${reason}; using ${llmPort()}.`);
    }
    state.llm_external = false;
    await spawnLlamaServer(state);
  }

  state.kiwix_external = await llmClient.basicHealthCheck(kiwixPort(), '/');
  if (state.kiwix_external) {
    state.kiwix_running = true;
    state.kiwix_zim_files = zimFiles();
    console.log(`[NuclearUSB] Reusing existing Kiwix service on port ${kiwixPort()}.`);
  } else {
    spawnKiwixServer(state);
  }
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

listenOnAvailablePort(apiPort())
  .then((port) => {
    printStartupBanner(port);
    openBrowser(port);
    // Start child services only after the API has claimed its port. This
    // prevents failed starts from leaving duplicate runtimes after a retry.
    return startOptionalServices();
  })
  .catch((err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`[NuclearUSB] Could not find a free API port after trying ${MAX_API_PORT_ATTEMPTS + 1} ports.`);
    } else {
      console.error(`[NuclearUSB] Server failed to start: ${err.message}`);
    }
    shutdown(1);
  });
