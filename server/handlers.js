const fs = require('fs');
const path = require('path');
const mock = require('./mock');
const llmClient = require('./llm-client');

function classifyCategory(message, medicalKeywords = []) {
  if (!message || typeof message !== 'string') return 'general';
  const text = message.toLowerCase();
  for (const keyword of medicalKeywords) {
    if (text.includes(keyword.toLowerCase())) return 'medical';
  }
  return 'general';
}

async function handleHealth(req, res, ctx) {
  const processUp = llmClient.processAlive(ctx.state);
  const llmRunning = processUp || await ctx.helpers.llmHealth();
  sendJSON(res, {
    ok: true,
    service: 'NuclearUSB',
    mode: ctx.state.mode,
    llm_server_running: llmRunning
  });
}

async function handleStatus(req, res, ctx) {
  await ctx.helpers.waitForLlmTransition();
  ctx.helpers.refreshMode();
  if (ctx.state.mode === 'real' && !ctx.state.llm_process && !ctx.state.llm_external) {
    await ctx.helpers.spawnLlamaServer();
  }

  const processUp = llmClient.processAlive(ctx.state);
  const llmRunning = processUp || await ctx.helpers.llmHealth();
  const kiwixRunning = await ctx.helpers.kiwixHealth();
  const kiwixZimFiles = ctx.helpers.kiwixZimFiles();

  sendJSON(res, {
    ok: true,
    mode: (processUp || llmRunning) && ctx.state.mode === 'real' ? 'real' : ctx.state.mode,
    active_model: ctx.state.active_model,
    llm_server_running: llmRunning,
    kiwix_running: kiwixRunning,
    kiwix_zim_files: kiwixZimFiles,
    version: ctx.config.app.version,
    labels: {
      demo: ctx.config.app.demo_mode_label,
      real: ctx.config.app.real_mode_label
    },
    ports: ctx.config.ports
  });
}

function handleModels(req, res, ctx) {
  const models = ctx.config.models.models.map(model => {
    const exists = ctx.helpers.modelExists(model);
    return {
      id: model.id,
      name: model.name,
      path: model.path,
      ctx_size: model.ctx_size,
      gpu_layers: model.gpu_layers,
      description: model.description,
      system_prompt: model.system_prompt || '',
      exists,
      active: model.id === ctx.state.active_model
    };
  });

  sendJSON(res, { active_model: ctx.state.active_model, models });
}

async function handleSwitchModel(req, res, ctx) {
  const body = await parseBody(req);
  const modelId = body && (body.model || body.model_id);

  if (!modelId) {
    sendJSON(res, { ok: false, error: 'Missing model or model_id field' }, 400);
    return;
  }

  const model = ctx.config.models.models.find(item => item.id === modelId);
  if (!model) {
    sendJSON(res, { ok: false, error: `Invalid model '${modelId}'` }, 400);
    return;
  }

  const previousModel = ctx.state.active_model;
  ctx.state.active_model = modelId;
  ctx.helpers.refreshMode();
  let llmReady = false;
  if (ctx.state.mode === 'real') {
    if (previousModel === modelId) {
      llmReady = await ctx.helpers.ensureLlmReady();
    } else {
      llmReady = await ctx.helpers.restartLlamaServer();
    }
  }

  if (ctx.state.mode === 'real' && !llmReady) {
    ctx.state.active_model = previousModel;
    ctx.helpers.refreshMode();
    sendJSON(res, { ok: false, error: `Model '${modelId}' did not become ready.` }, 503);
    return;
  }

  sendJSON(res, {
    ok: true,
    mode: ctx.state.mode,
    active_model: modelId,
    model_exists: ctx.helpers.modelExists(model)
  });
}

async function handleChat(req, res, ctx) {
  const body = await parseBody(req);
  const message = body && (body.message || (Array.isArray(body.messages) && body.messages.length > 0 && body.messages[body.messages.length - 1].content));

  if (!message || typeof message !== 'string') {
    sendJSON(res, { ok: false, error: 'Missing message field' }, 400);
    return;
  }

  const messages = Array.isArray(body.messages) ? body.messages : [{ role: 'user', content: message }];
  const temperature = llmClient.clampTemperature(body && body.temperature);
  const requestedMaxTokens = Number(body && body.maxTokens);
  const maxTokens = Number.isFinite(requestedMaxTokens)
    ? Math.max(16, Math.min(requestedMaxTokens, 2048))
    : 512;
  const category = classifyCategory(message, ctx.config.app.medical_keywords || []);
  const isMedical = category === 'medical';
  const model = ctx.helpers.activeModelConfig();

  let reply = '';
  let mode = ctx.state.mode;
  let llm_error = null;
  let timings = null;

  // Trust the process being alive as primary check, fall back to HTTP health.
  // During a model transition, wait for the new process instead of exposing a
  // DEMO response while the selected model is still loading.
  const llmReady = ctx.state.mode === 'real' && await ctx.helpers.ensureLlmReady();

  if (llmReady) {
    try {
      const systemPrompt = llmClient.buildSystemPrompt(
        model,
        category,
        ctx.config.app.medical_disclaimer
      );
      let result;
      try {
        result = await llmClient.chatCompletion(messages, systemPrompt, model, ctx.config.ports.llm_server, { temperature, maxTokens });
      } catch (firstError) {
        // llama-server can briefly reject requests while it has just finished
        // loading a new model or is releasing the previous one. Give it one
        // bounded retry before declaring the real model unavailable.
        await new Promise(resolve => setTimeout(resolve, 750));
        if (!await ctx.helpers.ensureLlmReady()) throw firstError;
        result = await llmClient.chatCompletion(messages, systemPrompt, model, ctx.config.ports.llm_server, { temperature, maxTokens });
      }
      reply = result.text;
      timings = result.timings;
      mode = 'real';
    } catch (err) {
      llm_error = err.message;
      sendJSON(res, {
        ok: false,
        error: `Il modello '${ctx.state.active_model}' non è pronto: ${err.message}`,
        mode: 'error',
        active_model: ctx.state.active_model,
        llm_error
      }, 503);
      return;
    }
  } else if (ctx.state.mode === 'demo') {
    mode = 'demo';
    reply = mock.generateModelOnlyMockResponse(message, category, ctx.config.app);
  } else {
    sendJSON(res, {
      ok: false,
      error: `Il modello '${ctx.state.active_model}' non è pronto. Attendi il completamento del caricamento e riprova.`,
      mode: 'error',
      active_model: ctx.state.active_model
    }, 503);
    return;
  }

  sendJSON(res, {
    ok: true,
    reply,
    is_medical: isMedical,
    medical_disclaimer: isMedical ? ctx.config.app.medical_disclaimer : null,
    mode,
    active_model: ctx.state.active_model,
    category,
    temperature,
    maxTokens,
    timings,
    llm_error
  });
}

async function handleUpdatePrompt(req, res, ctx) {
  const body = await parseBody(req);
  const modelId = body && body.model_id;
  const newPrompt = body && body.system_prompt;

  if (!modelId || typeof newPrompt !== 'string') {
    sendJSON(res, { ok: false, error: 'Missing model_id or system_prompt' }, 400);
    return;
  }

  const model = ctx.config.models.models.find(m => m.id === modelId);
  if (!model) {
    sendJSON(res, { ok: false, error: `Model '${modelId}' not found` }, 404);
    return;
  }

  model.system_prompt = newPrompt;

  // Persist to config/models.json
  try {
    const configPath = path.join(ctx.projectRoot, 'config', 'models.json');
    fs.writeFileSync(configPath, JSON.stringify({ models: ctx.config.models.models }, null, 2), 'utf8');
    sendJSON(res, { ok: true, model_id: modelId, system_prompt: newPrompt });
  } catch (err) {
    sendJSON(res, { ok: false, error: `Failed to save: ${err.message}` }, 500);
  }
}

function handleShutdown(req, res, ctx) {
  if (ctx.state.shutdown_requested) {
    sendJSON(res, { ok: true, message: 'Shutting down...' });
    return;
  }

  ctx.state.shutdown_requested = true;
  console.log('[NuclearUSB] Shutdown requested');
  sendJSON(res, { ok: true, message: 'Shutting down...' });

  setTimeout(() => {
    if (ctx.state.llm_process && !ctx.state.llm_process.killed) {
      try { ctx.state.llm_process.kill('SIGTERM'); } catch (err) { /* ignore */ }
    }
    if (ctx.state.kiwix_process && !ctx.state.kiwix_process.killed) {
      try { ctx.state.kiwix_process.kill('SIGTERM'); } catch (err) { /* ignore */ }
    }
    if (ctx.server) {
      ctx.server.close(() => process.exit(0));
      setTimeout(() => process.exit(0), 1000);
    } else {
      process.exit(0);
    }
  }, 250);
}

function parseBody(req) {
  return new Promise(resolve => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (err) {
        resolve(null);
      }
    });
    req.on('error', () => resolve(null));
  });
}

function sendJSON(res, data, statusCode = 200) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data));
}

module.exports = {
  handleHealth,
  handleStatus,
  handleModels,
  handleSwitchModel,
  handleChat,
  handleUpdatePrompt,
  handleShutdown,
  sendJSON
};
