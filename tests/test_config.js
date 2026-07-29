const fs = require('fs');
const path = require('path');
const llmClient = require('../server/llm-client');

const ROOT = path.resolve(path.join(__dirname, '..'));
let passed = 0;
let total = 0;

function assert(condition, message) {
  total++;
  if (!condition) {
    console.error(`[FAIL] ${message}`);
    return;
  }
  passed++;
  console.log(`[PASS] ${message}`);
}

function readJSON(relPath) {
  const fullPath = path.join(ROOT, relPath);
  assert(fs.existsSync(fullPath), `${relPath} exists`);
  return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
}

const app = readJSON('config/app.json');
const ports = readJSON('config/ports.json');
const models = readJSON('config/models.json');

assert(app.app_name === 'NuclearUSB', 'app_name is NuclearUSB');
assert(app.current_target === 'Windows 10/11 x64', 'current target is Windows-only');
assert(Array.isArray(app.medical_keywords) && app.medical_keywords.length >= 20, 'medical_keywords has at least 20 entries');
assert(app.demo_mode_label === 'DEMO', 'demo mode label is DEMO');
assert(app.real_mode_label === 'LOCAL AI', 'real mode label is LOCAL AI');
assert(typeof app.medical_disclaimer === 'string' && app.medical_disclaimer.includes('118'), 'medical disclaimer is present');

assert(ports.api_server === 3001, 'api_server port is 3001');
assert(ports.llm_server === 8080, 'llm_server port is 8080');
assert(ports.kiwix_server === 8081, 'kiwix_server port is 8081');

assert(Array.isArray(models.models) && models.models.length === 3, 'three models are configured');
const required = {
  fast: 'downloads/models/fast/Phi-3.5-mini-instruct-Q4_K_M.gguf',
  power: 'downloads/models/power/Gemma-4-12B-OBLITERATED-Q4_K_M.gguf',
  coding: 'downloads/models/coding/gemma4-coding-Q4_K_M.gguf'
};

for (const model of models.models) {
  assert(required[model.id] === model.path, `${model.id} uses expected Windows GGUF path`);
  assert(typeof model.name === 'string' && model.name.length > 0, `${model.id} has name`);
  assert(typeof model.ctx_size === 'number', `${model.id} has ctx_size`);
  assert(typeof model.gpu_layers === 'number', `${model.id} has gpu_layers`);
  assert(typeof model.description === 'string', `${model.id} has description`);
  assert(typeof model.system_prompt === 'string' && model.system_prompt.includes('NuclearUSB'), `${model.id} has NuclearUSB system prompt`);
  const modelPath = path.join(ROOT, model.path);
  if (fs.existsSync(modelPath)) {
    console.log(`[PASS] ${model.id} GGUF path exists`);
  } else {
    console.log(`[INFO] ${model.id} GGUF is not bundled; README setup is required`);
  }
}

assert(llmClient.clampTemperature('0.2') === 0.2, 'temperature parser accepts numeric strings');
assert(llmClient.clampTemperature(3) === 1.0, 'temperature parser clamps high values');
assert(llmClient.clampTemperature(-1) === 0.1, 'temperature parser clamps low values');
assert(
  llmClient.cleanModelOutput('<|channel>thought\n<channel|>Risposta pronta.') === 'Risposta pronta.',
  'model output removes thought-channel protocol markers'
);
const timings = llmClient.normalizeTimings({ predicted_per_second: 12.34, predicted_n: 42, predicted_ms: 2100, prompt_n: 8, prompt_ms: 300 }, null);
assert(timings.tokens_per_second === 12.34, 'timings expose tokens_per_second from predicted_per_second');
assert(timings.completion_tokens === 42, 'timings expose completion token count');

console.log(`Config tests passed: ${passed}/${total}`);
process.exit(passed === total ? 0 : 1);
