#!/usr/bin/env node

const http = require('http');
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

function spawnLlamaServer(state) {
  const model = activeModelConfig(state);
  const llamaServer = path.join(WINDOWS_LLM_DIR, 'llama-server.exe');
  const modelPath = path.join(PROJECT_ROOT, model.path);

  if (!canUseRealMode(state)) return;
  if (state.llm_process && !state.llm_process.killed) return;

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
}

function restartLlamaServer(state) {
  const existing = state.llm_process;
  if (!existing || existing.killed) {
    state.llm_process = null;
    spawnLlamaServer(state);
    return;
  }

  let restarted = false;
  const start = () => {
    if (restarted) return;
    restarted = true;
    state.llm_process = null;
    spawnLlamaServer(state);
  };

  existing.once('exit', start);
  try {
    existing.kill('SIGTERM');
  } catch (err) {
    start();
  }
  setTimeout(start, 2000);
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
  mode: 'demo',
  llm_process: null,
  kiwix_process: null,
  kiwix_running: false,
  kiwix_zim_files: []
};

refreshMode(state);
spawnLlamaServer(state);
spawnKiwixServer(state);

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
    route(req, res, ctx);
  } catch (err) {
    console.error(`[NuclearUSB] Unhandled error: ${err.message}`);
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: false, error: 'Internal Server Error' }));
  }
});
ctx.server = server;

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n[NuclearUSB] ERROR: Port ${apiPort()} is already in use.`);
    console.error('[NuclearUSB] Close the other process using that port, then try again.\n');
  } else {
    console.error(`\n[NuclearUSB] Server error: ${err.message}\n`);
  }
  process.exit(1);
});

server.listen(apiPort(), () => {
  console.log('');
  console.log('=======================================================');
  console.log('NuclearUSB Windows Offline AI Suite');
  console.log(`Target: Windows x64 | API: http://localhost:${apiPort()}`);
  console.log(`Mode: ${state.mode.toUpperCase()} | Active model: ${state.active_model}`);
  console.log(`Kiwix Wikipedia: ${state.kiwix_running ? 'RUNNING' : 'OFF'} | ZIM files: ${zimFilenames(state).length}`);
  console.log('=======================================================');
  console.log('');
});

function shutdown() {
  console.log('\n[NuclearUSB] Shutting down...');
  if (state.llm_process) state.llm_process.kill();
  if (state.kiwix_process) state.kiwix_process.kill();
  state.kiwix_running = false;
  server.close(() => process.exit(0));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
