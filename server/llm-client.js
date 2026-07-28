const http = require('http');

function buildSystemPrompt(modelConfig, queryCategory, medicalDisclaimer) {
  let prompt = modelConfig && modelConfig.system_prompt
    ? modelConfig.system_prompt
    : 'Sei NuclearUSB, un assistente AI offline portatile per Windows progettato per funzionare senza connessione internet.';

  if (queryCategory === 'medical' && medicalDisclaimer) {
    prompt += `\n\nNota di sicurezza medica: ${medicalDisclaimer}`;
  }

  return prompt;
}

function requestJSON(port, route, method, payload, timeout = 120000) {
  const body = payload ? JSON.stringify(payload) : '';

  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '127.0.0.1',
      port,
      path: route,
      method,
      timeout,
      headers: payload ? {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      } : {}
    }, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`${method} ${route} returned HTTP ${res.statusCode}: ${data.slice(0, 200)}`));
          return;
        }
        try {
          resolve(data ? JSON.parse(data) : {});
        } catch (err) {
          reject(new Error(`Failed to parse ${route} response: ${err.message}`));
        }
      });
    });

    req.on('error', err => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`${method} ${route} timed out`));
    });

    if (body) req.write(body);
    req.end();
  });
}

function normalizeTimings(timings, usage) {
  if (!timings && !usage) return null;
  return {
    tokens_per_second: Number(timings && timings.predicted_per_second) || 0,
    prompt_tokens: Number((timings && timings.prompt_n) || (usage && usage.prompt_tokens)) || 0,
    completion_tokens: Number((timings && timings.predicted_n) || (usage && usage.completion_tokens)) || 0,
    prompt_ms: Number(timings && timings.prompt_ms) || 0,
    completion_ms: Number(timings && timings.predicted_ms) || 0,
    predicted_per_second: Number(timings && timings.predicted_per_second) || 0
  };
}

function clampTemperature(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0.7;
  return Math.max(0.1, Math.min(1.0, n));
}

/**
 * Chat completion via llama-server. Returns { text, timings }.
 */
async function chatCompletion(messages, systemPrompt, modelConfig, llmPort, options = {}) {
  const formattedMessages = [
    { role: 'system', content: systemPrompt }
  ];

  if (Array.isArray(messages)) {
    for (const msg of messages) {
      if (msg && msg.role && msg.content) {
        formattedMessages.push({ role: msg.role, content: msg.content });
      }
    }
  } else if (typeof messages === 'string') {
    formattedMessages.push({ role: 'user', content: messages });
  }

  const payload = {
    messages: formattedMessages,
    temperature: clampTemperature(options.temperature),
    n_predict: Math.min(Math.floor((modelConfig.ctx_size || 4096) / 2), 2048),
    stream: false
  };

  try {
    const parsed = await requestJSON(llmPort, '/v1/chat/completions', 'POST', payload);
    const content = parsed.choices && parsed.choices[0] && parsed.choices[0].message && parsed.choices[0].message.content;
    const timings = parsed.timings || null;
    const usage = parsed.usage || null;
    if (content) {
      return {
        text: content,
        timings: normalizeTimings(timings, usage)
      };
    }
  } catch (err) {
    // Fallback to raw /completion endpoint
    const lastUserMsg = Array.isArray(messages)
      ? (messages.filter(m => m.role === 'user').pop() || {}).content || ''
      : messages;

    const completionPrompt = `${systemPrompt}\n\nUSER:\n${lastUserMsg}\n\nASSISTANT:`;
    const parsed = await requestJSON(llmPort, '/completion', 'POST', {
      prompt: completionPrompt,
      temperature: payload.temperature,
      n_predict: payload.n_predict,
      stream: false
    });
    const text = parsed.content || parsed.response || '';
    if (text) {
      return {
        text,
        timings: normalizeTimings(parsed.timings, null)
      };
    }
  }

  throw new Error('llama-server returned no usable completion text');
}

async function healthCheck(llmPort) {
  return basicHealthCheck(llmPort, '/health');
}

function basicHealthCheck(port, route) {
  return new Promise(resolve => {
    const req = http.request({
      hostname: '127.0.0.1',
      port,
      path: route,
      method: 'GET',
      timeout: 5000
    }, res => {
      res.resume();
      res.on('end', () => resolve(res.statusCode >= 200 && res.statusCode < 500));
    });

    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
    req.end();
  });
}

/**
 * Fast check: is the llama-server process alive?
 */
function processAlive(state) {
  const child = state && state.llm_process;
  if (!child || child.killed) return false;
  if (typeof child.exitCode !== 'undefined' && child.exitCode !== null) return false;
  if (typeof child.signalCode !== 'undefined' && child.signalCode !== null) return false;
  return true;
}

module.exports = {
  buildSystemPrompt,
  chatCompletion,
  healthCheck,
  basicHealthCheck,
  processAlive,
  normalizeTimings,
  clampTemperature
};
