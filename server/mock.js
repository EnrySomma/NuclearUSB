// ============================================================
// NuclearUSB - Demo Mode Response Generator
// ============================================================

function generateModelOnlyMockResponse(query, queryCategory, appConfig) {
  const queryLower = (query || '').toLowerCase();
  const parts = [];

  if (queryCategory === 'medical') {
    if (appConfig && appConfig.medical_disclaimer) {
      parts.push(`*${appConfig.medical_disclaimer}*\n`);
    }
    parts.push(`In modalita DEMO, ecco linee guida generali di primo soccorso per "${query}":\n\n1. Assicurati che l'area sia sicura.\n2. Valuta coscienza, respirazione e sanguinamenti evidenti.\n3. Per sintomi importanti o dubbi, chiama subito 118 o 112.\n\nPer risposte AI complete, verifica che llama-server e un modello GGUF siano disponibili.`);
    return parts.join('\n\n');
  }

  if (queryLower.includes('hello') || queryLower.includes('ciao') || queryLower.includes('hi')) {
    return 'Ciao! Sono NuclearUSB, il tuo assistente AI offline portatile per Windows.\n\nIl sistema e in modalita DEMO perche il runtime LLM locale non e pronto. Quando llama-server e un modello GGUF saranno disponibili, usero la modalita LOCAL AI.';
  }

  if (queryLower.includes('code') || queryLower.includes('python') || queryLower.includes('javascript') || queryLower.includes('function') || queryLower.includes('funzione')) {
    return 'Ecco un esempio in modalita DEMO:\n\n```javascript\nfunction executeOfflineTask(taskName) {\n  console.log("Esecuzione task offline: " + taskName);\n  return { success: true, timestamp: Date.now() };\n}\n```\n\nAttiva LOCAL AI inserendo i file modello GGUF per risposte di codice personalizzate.';
  }

  return `[NuclearUSB DEMO] Richiesta ricevuta: "${query}".\n\nIl sistema e in modalita dimostrativa. Se i modelli sono presenti ma vedi ancora DEMO, controlla lo stato LLM nel drawer: NuclearUSB ora considera valido anche il processo llama-server vivo quando il controllo HTTP e occupato.`;
}

module.exports = {
  generateModelOnlyMockResponse
};
