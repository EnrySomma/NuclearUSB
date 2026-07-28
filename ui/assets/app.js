(function () {
  'use strict';

  const API = '';
  const MODEL_META = {
    fast: { label: 'Fast', tone: 'risposte rapide e concise' },
    power: { label: 'Power', tone: 'analisi piu profonde' },
    coding: { label: 'Coding', tone: 'supporto tecnico e codice' }
  };

  const state = {
    mode: 'demo',
    activeModel: 'fast',
    llmRunning: false,
    kiwixRunning: false,
    zimFiles: [],
    ports: { api_server: 3001, llm_server: 8080, kiwix_server: 8081 },
    temp: 0.7,
    messages: [],
    models: [],
    lastTokSpeed: null,
    busy: false
  };

  const $ = id => document.getElementById(id);
  const dom = {
    modeBadge: $('mode-badge'),
    modelSelect: $('model-select'),
    wikiBtn: $('wiki-btn'),
    settingsToggle: $('settings-toggle'),
    shutdownBtn: $('shutdown-btn'),
    chatMessages: $('chat-messages'),
    welcome: $('welcome'),
    chatInput: $('chat-input'),
    sendBtn: $('send-btn'),
    newChatBtn: $('new-chat-btn'),
    messageCount: $('message-count'),
    footerStatus: $('footer-status'),
    drawer: $('settings-drawer'),
    closeDrawer: $('close-drawer'),
    backdrop: $('drawer-backdrop'),
    modelCards: $('model-cards'),
    promptList: $('prompt-list'),
    savePromptBtn: $('save-prompt-btn'),
    tempSlider: $('temp-slider'),
    tempVal: $('temp-val'),
    wikiStatusText: $('wiki-status-text'),
    wikiDrawerBtn: $('wiki-drawer-btn'),
    sMode: $('s-mode'),
    sLlm: $('s-llm'),
    sKiwix: $('s-kiwix'),
    sPort: $('s-port'),
    toasts: $('toast-container'),
    shutdownOverlay: $('shutdown-overlay')
  };

  function init() {
    bindEvents();
    renderModelCards();
    refreshMessageCount();
    fetchModels();
    fetchStatus();
    setInterval(fetchStatus, 12000);
  }

  function bindEvents() {
    dom.settingsToggle.addEventListener('click', openDrawer);
    dom.closeDrawer.addEventListener('click', closeDrawer);
    dom.backdrop.addEventListener('click', closeDrawer);

    dom.modelSelect.addEventListener('change', event => switchModel(event.target.value));
    dom.sendBtn.addEventListener('click', submitChat);
    dom.newChatBtn.addEventListener('click', clearChat);
    dom.savePromptBtn.addEventListener('click', savePrompts);
    dom.shutdownBtn.addEventListener('click', requestShutdown);

    dom.tempSlider.addEventListener('input', event => {
      state.temp = Number(event.target.value);
      dom.tempVal.textContent = state.temp.toFixed(1);
    });

    dom.chatInput.addEventListener('input', autosizeInput);
    dom.chatInput.addEventListener('keydown', event => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        submitChat();
      }
    });

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') closeDrawer();
    });

    bindStarterCards(document);
  }

  function bindStarterCards(root) {
    root.querySelectorAll('.starter-card').forEach(button => {
      button.addEventListener('click', () => {
        dom.chatInput.value = button.dataset.q || '';
        autosizeInput();
        submitChat();
      });
    });
  }

  async function fetchStatus() {
    try {
      const data = await requestJSON('/api/status');
      state.mode = data.mode || 'demo';
      state.activeModel = data.active_model || state.activeModel;
      state.llmRunning = Boolean(data.llm_server_running);
      state.kiwixRunning = Boolean(data.kiwix_running);
      state.zimFiles = Array.isArray(data.kiwix_zim_files) ? data.kiwix_zim_files : [];
      state.ports = data.ports || state.ports;
      refreshUI();
    } catch (err) {
      dom.modeBadge.className = 'status-badge status-error';
      dom.modeBadge.textContent = 'OFFLINE';
      dom.footerStatus.textContent = 'Server non raggiungibile';
    }
  }

  async function fetchModels() {
    try {
      const data = await requestJSON('/api/models');
      state.models = Array.isArray(data.models) ? data.models : [];
      state.activeModel = data.active_model || state.activeModel;
      renderModelCards();
      renderPromptEditors();
      refreshUI();
    } catch (err) {
      toast('Impossibile leggere i modelli', true);
    }
  }

  async function switchModel(modelId) {
    if (!modelId || state.busy) return;
    try {
      const data = await requestJSON('/api/switch-model', {
        method: 'POST',
        body: { model: modelId }
      });
      state.activeModel = data.active_model || modelId;
      state.mode = data.mode || state.mode;
      refreshUI();
      toast('Modello attivo: ' + modelLabel(state.activeModel));
      fetchStatus();
    } catch (err) {
      toast('Cambio modello non riuscito', true);
    }
  }

  async function submitChat() {
    const text = dom.chatInput.value.trim();
    if (!text || state.busy) return;

    state.busy = true;
    dom.sendBtn.disabled = true;
    dom.chatInput.value = '';
    autosizeInput();
    hideWelcome();

    state.messages.push({ role: 'user', content: text });
    appendMessage('user', text);
    refreshMessageCount();

    const typing = appendTyping();

    try {
      const data = await requestJSON('/api/chat', {
        method: 'POST',
        body: {
          message: text,
          messages: state.messages,
          temperature: state.temp
        }
      });

      typing.remove();
      const reply = data.reply || 'Nessuna risposta disponibile.';
      state.messages.push({ role: 'assistant', content: reply });
      appendMessage('assistant', reply, data);

      if (data.is_medical && data.medical_disclaimer) {
        appendDisclaimer(data.medical_disclaimer);
      }
      refreshMessageCount();
      fetchStatus();
    } catch (err) {
      typing.remove();
      appendMessage('assistant', 'Errore: il server NuclearUSB non ha risposto.', { mode: 'error' });
      refreshMessageCount();
    } finally {
      state.busy = false;
      dom.sendBtn.disabled = false;
      dom.chatInput.focus();
    }
  }

  async function savePrompts() {
    const editors = Array.from(dom.promptList.querySelectorAll('textarea[data-model-id]'));
    if (editors.length === 0) return;

    dom.savePromptBtn.disabled = true;
    try {
      for (const editor of editors) {
        const modelId = editor.dataset.modelId;
        const value = editor.value.trim();
        if (!value) throw new Error('Prompt vuoto per ' + modelLabel(modelId));
        await requestJSON('/api/update-prompt', {
          method: 'POST',
          body: { model_id: modelId, system_prompt: value }
        });
        const model = state.models.find(item => item.id === modelId);
        if (model) model.system_prompt = value;
      }
      toast('Prompt salvati in config/models.json');
      renderPromptEditors();
    } catch (err) {
      toast(err.message || 'Salvataggio prompt non riuscito', true);
    } finally {
      dom.savePromptBtn.disabled = false;
    }
  }

  async function requestShutdown() {
    if (!window.confirm('Spegnere NuclearUSB? Server, LLM e Kiwix verranno fermati.')) return;
    dom.shutdownBtn.disabled = true;
    try {
      await requestJSON('/api/shutdown', { method: 'POST' });
    } catch (err) {
      // The server may close before the response completes.
    }
    dom.shutdownOverlay.classList.remove('hidden');
  }

  async function requestJSON(route, options = {}) {
    const init = {
      method: options.method || 'GET',
      headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
      body: options.body ? JSON.stringify(options.body) : undefined
    };
    const response = await fetch(API + route, init);
    const data = await response.json();
    if (!response.ok || data.ok === false) {
      throw new Error(data.error || response.statusText);
    }
    return data;
  }

  function renderModelCards() {
    const models = state.models.length ? state.models : [
      { id: 'fast', name: 'Fast', description: MODEL_META.fast.tone, exists: false },
      { id: 'power', name: 'Power', description: MODEL_META.power.tone, exists: false },
      { id: 'coding', name: 'Coding', description: MODEL_META.coding.tone, exists: false }
    ];

    dom.modelCards.innerHTML = '';
    for (const model of models) {
      const card = document.createElement('label');
      card.className = 'model-card';
      card.dataset.model = model.id;
      card.innerHTML = `
        <input type="radio" name="model" value="${escAttr(model.id)}">
        <span class="model-dot" aria-hidden="true"></span>
        <span class="model-copy">
          <strong>${esc(modelLabel(model.id))}</strong>
          <small>${esc(model.name || model.description || '')}</small>
        </span>
        <span class="model-state">${model.exists ? 'Pronto' : 'Manca file'}</span>
      `;
      card.addEventListener('click', () => switchModel(model.id));
      dom.modelCards.appendChild(card);
    }
  }

  function renderPromptEditors() {
    dom.promptList.innerHTML = '';
    for (const model of state.models) {
      const block = document.createElement('label');
      block.className = 'prompt-block';
      block.dataset.model = model.id;
      block.innerHTML = `
        <span>${esc(modelLabel(model.id))}</span>
        <textarea data-model-id="${escAttr(model.id)}" rows="5" spellcheck="false">${esc(model.system_prompt || '')}</textarea>
      `;
      dom.promptList.appendChild(block);
    }
    refreshPromptHighlight();
  }

  function refreshUI() {
    const isReal = state.mode === 'real';
    dom.modeBadge.className = 'status-badge ' + (isReal ? 'status-real' : 'status-demo');
    dom.modeBadge.textContent = isReal ? 'LOCAL AI' : 'DEMO';

    dom.modelSelect.value = state.activeModel;
    dom.modelCards.querySelectorAll('.model-card').forEach(card => {
      const active = card.dataset.model === state.activeModel;
      card.classList.toggle('active', active);
      const input = card.querySelector('input');
      if (input) input.checked = active;
    });
    refreshPromptHighlight();

    const kiwixPort = state.ports.kiwix_server || 8081;
    const wikiUrl = 'http://localhost:' + kiwixPort;
    dom.wikiBtn.href = wikiUrl;
    dom.wikiDrawerBtn.href = wikiUrl;
    dom.wikiBtn.classList.toggle('hidden', !state.kiwixRunning);
    dom.wikiDrawerBtn.classList.toggle('hidden', !state.kiwixRunning);

    if (state.kiwixRunning) {
      dom.wikiStatusText.textContent = 'Kiwix attivo. ZIM caricati: ' + state.zimFiles.length + '.';
    } else if (state.zimFiles.length > 0) {
      dom.wikiStatusText.textContent = 'ZIM trovati, Kiwix non ancora raggiungibile.';
    } else {
      dom.wikiStatusText.textContent = 'Nessun archivio .zim trovato in downloads/wikipedia.';
    }

    dom.sMode.textContent = isReal ? 'LOCAL AI' : 'DEMO';
    dom.sLlm.textContent = state.llmRunning ? 'Attivo' : 'Non rilevato';
    dom.sKiwix.textContent = state.kiwixRunning ? 'Attivo' : (state.zimFiles.length ? 'ZIM presenti' : 'No ZIM');
    dom.sPort.textContent = String(state.ports.api_server || 3001);

    const speed = state.lastTokSpeed ? ' | ' + state.lastTokSpeed.toFixed(1) + ' tok/s' : '';
    dom.footerStatus.textContent = (isReal ? 'LOCAL AI' : 'DEMO') + ' | ' + modelLabel(state.activeModel) + speed;
  }

  function refreshPromptHighlight() {
    dom.promptList.querySelectorAll('.prompt-block').forEach(block => {
      block.classList.toggle('active', block.dataset.model === state.activeModel);
    });
  }

  function appendMessage(role, text, data = {}) {
    const item = document.createElement('article');
    item.className = 'message ' + (role === 'user' ? 'message-user' : 'message-ai');

    const header = document.createElement('header');
    header.className = 'message-header';
    header.textContent = role === 'user' ? 'Tu' : 'NuclearUSB';

    if (role !== 'user') {
      const meta = document.createElement('span');
      meta.className = 'message-model';
      meta.textContent = modelLabel(data.active_model || state.activeModel);
      header.appendChild(meta);
    }

    const body = document.createElement('div');
    body.className = 'message-body';
    body.innerHTML = markdownLite(text);

    item.appendChild(header);
    item.appendChild(body);

    if (role !== 'user') {
      const footer = responseFooter(data);
      if (footer) item.appendChild(footer);
    }

    dom.chatMessages.appendChild(item);
    scrollToBottom();
  }

  function responseFooter(data) {
    const timings = data && data.timings;
    const footer = document.createElement('footer');
    footer.className = 'message-footer';

    const mode = document.createElement('span');
    mode.textContent = (data.mode === 'real' ? 'LOCAL AI' : data.mode === 'error' ? 'ERRORE' : 'DEMO');
    footer.appendChild(mode);

    if (timings && Number(timings.tokens_per_second) > 0) {
      const speed = Number(timings.tokens_per_second);
      state.lastTokSpeed = speed;
      const speedEl = document.createElement('span');
      speedEl.className = 'tok-speed';
      speedEl.textContent = speed.toFixed(1) + ' tok/s';
      footer.appendChild(speedEl);
    }

    if (timings && Number(timings.completion_tokens) > 0) {
      const tokens = document.createElement('span');
      tokens.textContent = Number(timings.completion_tokens) + ' token';
      footer.appendChild(tokens);
    }

    if (timings && Number(timings.completion_ms) > 0) {
      const duration = document.createElement('span');
      duration.textContent = (Number(timings.completion_ms) / 1000).toFixed(1) + 's';
      footer.appendChild(duration);
    }

    refreshUI();
    return footer;
  }

  function appendTyping() {
    const item = document.createElement('article');
    item.className = 'message message-ai';
    item.innerHTML = `
      <header class="message-header">NuclearUSB</header>
      <div class="typing" aria-label="Risposta in corso"><span></span><span></span><span></span></div>
    `;
    dom.chatMessages.appendChild(item);
    scrollToBottom();
    return item;
  }

  function appendDisclaimer(text) {
    const note = document.createElement('div');
    note.className = 'disclaimer';
    note.textContent = text;
    dom.chatMessages.appendChild(note);
    scrollToBottom();
  }

  function clearChat() {
    state.messages = [];
    state.lastTokSpeed = null;
    state.busy = false;
    dom.chatMessages.innerHTML = '';
    dom.welcome = createWelcome();
    dom.chatMessages.appendChild(dom.welcome);
    refreshMessageCount();
    refreshUI();
    toast('Conversazione cancellata');
  }

  function createWelcome() {
    const welcome = document.createElement('div');
    welcome.id = 'welcome';
    welcome.className = 'welcome';
    welcome.innerHTML = `
      <img src="assets/nuclearusb-logo.png" alt="NuclearUSB" class="welcome-logo">
      <h1>Assistente AI offline</h1>
      <p>Risposte locali, prompt configurabili e Wikipedia offline in una singola interfaccia.</p>
      <div class="starter-grid">
        <button class="starter-card" type="button" data-q="Come tratto una piccola ustione?">Primo soccorso ustioni</button>
        <button class="starter-card" type="button" data-q="Spiega il three-way handshake TCP.">TCP handshake</button>
        <button class="starter-card" type="button" data-q="Scrivi una funzione JavaScript per ordinare un array di oggetti.">Codice JavaScript</button>
        <button class="starter-card" type="button" data-q="Come posso rendere potabile l'acqua in emergenza?">Acqua potabile</button>
      </div>
    `;
    bindStarterCards(welcome);
    return welcome;
  }

  function hideWelcome() {
    if (dom.welcome) {
      dom.welcome.remove();
      dom.welcome = null;
    }
  }

  function refreshMessageCount() {
    const count = state.messages.length;
    dom.messageCount.textContent = count + (count === 1 ? ' messaggio' : ' messaggi');
  }

  function autosizeInput() {
    dom.chatInput.style.height = 'auto';
    dom.chatInput.style.height = Math.min(dom.chatInput.scrollHeight, 180) + 'px';
  }

  function openDrawer() {
    dom.drawer.classList.remove('drawer-closed');
    dom.backdrop.classList.remove('hidden');
  }

  function closeDrawer() {
    dom.drawer.classList.add('drawer-closed');
    dom.backdrop.classList.add('hidden');
  }

  function toast(message, isError) {
    const toastEl = document.createElement('div');
    toastEl.className = 'toast' + (isError ? ' toast-error' : '');
    toastEl.textContent = message;
    dom.toasts.appendChild(toastEl);
    setTimeout(() => toastEl.remove(), 3200);
  }

  function scrollToBottom() {
    dom.chatMessages.scrollTop = dom.chatMessages.scrollHeight;
  }

  function modelLabel(id) {
    return MODEL_META[id] ? MODEL_META[id].label : String(id || 'Model');
  }

  function markdownLite(text) {
    let html = esc(text);
    html = html.replace(/```([a-zA-Z0-9_-]*)\n?([\s\S]*?)```/g, (_, lang, code) => {
      return '<pre><code data-lang="' + escAttr(lang) + '">' + code.trim() + '</code></pre>';
    });
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/^\s*[-*]\s+(.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>[\s\S]*?<\/li>)/g, '<ul>$1</ul>');
    html = html.replace(/<\/ul>\s*<ul>/g, '');
    html = html.replace(/\n\n/g, '<br><br>');
    return html;
  }

  function esc(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function escAttr(value) {
    return esc(value).replace(/'/g, '&#39;');
  }

  init();
})();
