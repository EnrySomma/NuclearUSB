# NuclearUSB 🚀🔋

Portable offline AI su USB per Windows x64 — interfaccia browser locale, modelli LLM eseguiti con llama.cpp e conoscenza offline tramite Kiwix (archivi .zim). Funziona senza connessione Internet: porta l'assistente AI con te su una chiavetta.

![Hero screenshot](assets/hero.png)
*Screenshot dimostrativo — sostituisci `assets/hero.png` con un’immagine reale.*

---

## ✨ Che cos'è NuclearUSB?

NuclearUSB è un assistente AI portatile e offline pensato per scenari in cui non è possibile (o non si vuole) usare servizi cloud. L'architettura è semplice e robusta:

- Un server LLM locale basato su llama.cpp (llama-server.exe) che carica modelli GGUF.
- Una UI web leggera avviata localmente (il launcher apre automaticamente Chrome).
- Kiwix per navigare Wikipedia offline (.zim) come risorsa separata.
- Tutto può stare su un drive USB: runtime, modelli, archivi ZIM.

Per chi vuole un assistente che:
- Funzioni offline (privacy e affidabilità),
- Sia rapido da avviare su Windows x64,
- Permetta di scegliere tra modelli "fast", "power" e "coding".

---

## ⭐ Principali funzionalità

- ✅ Avvio rapido con launcher (start.bat)
- ✅ Interfaccia web locale (porta predefinita: 3001)
- ✅ Supporto per più modelli GGUF (Fast / Power / Coding)
- ✅ Kiwix integrato per consultare Wikipedia offline
- ✅ Nessuna dipendenza cloud — tutto locale
- ✅ Riconfigurabile via file JSON in `config/`

---

## 📸 Galleria (sostituisci con screenshot reali)

![UI history](assets/screenshot-history.png)
*Cronologia delle conversazioni*

![UI composer](assets/screenshot-composer.png)
*Composer e selezione modelli*

---

## 🚀 Avvio rapido

1. Assicurati di avere Node.js LTS installato: https://nodejs.org/en/download/
2. Scarica e posiziona gli asset esterni (vedi "Asset da scaricare" più sotto).
3. Doppio clic su `start.bat` nella root del progetto.
4. Il launcher avvia il server e apre Chrome su `http://localhost:3001` (se occupata, sceglie la porta libera successiva).
5. In UI, scegli il modello (Fast / Power / Coding) e interagisci.

---

## 📁 Struttura degli asset locali (da creare su USB)

Non includere i binari nel repo — posizionali in questa struttura:

```text
downloads/
├─ models/
│  ├─ fast/Phi-3.5-mini-instruct-Q4_K_M.gguf
│  ├─ power/Gemma-4-12B-OBLITERATED-Q4_K_M.gguf
│  └─ coding/gemma4-coding-Q4_K_M.gguf
├─ runtime/
│  ├─ llm/win/llama-server.exe        (+ DLL della release llama.cpp)
│  └─ kiwix/win/kiwix-serve.exe       (+ DLL della release Kiwix)
└─ wikipedia/
   └─ uno o più file .zim
```

Nota: non usare `server/models` o `downloads/knowledge` — l'app non li legge.

---

## 📥 Asset da scaricare (in breve)

1. Runtime LLM — llama.cpp  
   - Release ufficiale: https://github.com/ggml-org/llama.cpp/releases  
   - Per Windows x64 con NVIDIA: scegli la build "Windows x64 (CUDA 12)".  
   - Estrai `llama-server.exe` + DLL in `downloads/runtime/llm/win/`.

2. Modelli GGUF  
   - Fast: downloads/models/fast/Phi-3.5-mini-instruct-Q4_K_M.gguf  
     (circa 2.4 GB)  
     Link: https://huggingface.co/goodasdgood/Phi-3.5-mini-instruct-Q4_K_M-GGUF  
   - Power: downloads/models/power/Gemma-4-12B-OBLITERATED-Q4_K_M.gguf  
     (circa 7.4 GB)  
     Link: https://huggingface.co/OBLITERATUS/Gemma-4-12B-OBLITERATED  
   - Coding: downloads/models/coding/gemma4-coding-Q4_K_M.gguf  
     Link: https://huggingface.co/yuxinlu1/gemma-4-12B-coder-fable5-composer2.5-v1-GGUF

   Controlla sempre licenze e checksum sulle pagine dei modelli.

3. Runtime Kiwix  
   - Scarica Kiwix Tools per Windows: https://download.kiwix.org/release/kiwix-tools/  
   - Estrai `kiwix-serve.exe` + DLL in `downloads/runtime/kiwix/win/`.

4. Archivi Wikipedia `.zim`  
   - Scegli dalla libreria ufficiale: https://library.kiwix.org/  
   - O direttamente: https://download.kiwix.org/zim/wikipedia/  
   - Copia i file `.zim` in `downloads/wikipedia/`. Kiwix sarà disponibile su porta 8081.

---

## ⚙️ Configurazione

- `config/models.json` — definisce nomi, percorsi e prompt per i modelli.
- `config/ports.json` — porta API (default 3001), LLM (8080), Kiwix (8081). Le porte possono avanzare automaticamente se occupate.

Suggerimento: se cambi percorsi o nomi dei modelli, aggiorna `config/models.json`.

---

## ✅ Verifica (test)

Con server avviato, esegui:

```powershell
node tests/test_config.js
node tests/test_api.js
```

I test controllano configurazione e risposte API di base.

---

## 🔧 Suggerimenti e risoluzione problemi

- Se la porta 3001 è occupata, il launcher sceglierà automaticamente la successiva libera.
- Se usi GPU NVIDIA, installa driver aggiornati e usa la build CUDA di llama.cpp.
- Se un modello non si carica, verifica che il nome del file e il percorso corrispondano a quelli indicati in `config/models.json`.
- Kiwix è indipendente dalla chat: il pulsante "Wikipedia" apre Kiwix sul server locale (porta 8081).

---

## 🛡️ Requisiti e licenze

- Windows 10/11 x64.
- Node.js LTS.
- Spazio su disco sufficiente per runtime, modelli e archivi ZIM.
- I binari, modelli e archivi hanno licenze proprie: consultare le rispettive pagine ufficiali prima di redistribuire.

---

## 🙏 Ringraziamenti & Contatti

Creato da EnrySomma — contribuizioni benvenute tramite PR/issue.  
Descrizione: Portable offline AI on a USB drive: local LLMs, browser UI, offline knowledge, document citations, and topic-aware guide surfacing.

---

## 📜 Licenza

Indica qui la licenza del repository (es. MIT) o lascia un collegamento alla licenza desiderata.
