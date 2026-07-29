<div align="center">
  <img src="https://github.com/user-attachments/assets/298a67c8-e313-4e85-b526-6a94236ff1ec" alt="nuclearusb-logo" width="120" />

  <h1>NuclearUSB</h1>

  <p align="center"><strong>Assistente AI portatile e completamente offline su USB per Windows x64</strong> — interfaccia browser locale, modelli LLM eseguiti con <code>llama.cpp</code> e conoscenza offline tramite <em>Kiwix</em> (.zim). Funziona senza connessione Internet; privacy, portabilità e facilità d'uso sono al centro del progetto.</p>
</div>

<p align="center">
  <img src="https://img.shields.io/badge/platform-Windows%2010%2F11%20x64-0078D6?style=for-the-badge&logo=windows&logoColor=white" alt="Platform"/>
  <img src="https://img.shields.io/badge/Node.js-LTS-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js"/>
  <img src="https://img.shields.io/badge/LLM%20engine-llama.cpp-black?style=for-the-badge&logo=github" alt="llama.cpp"/>
  <img src="https://img.shields.io/badge/offline%20knowledge-Kiwix-orange?style=for-the-badge" alt="Kiwix"/>
  <img src="https://img.shields.io/badge/offline-ready-brightgreen?style=for-the-badge" alt="Offline"/>
</p>

<img width="2550" height="1297" alt="image" src="https://github.com/user-attachments/assets/e450ceee-58fe-463a-9fe3-2760aea4860a" />

---

## ✨ Che cos'è NuclearUSB?

NuclearUSB è un assistente AI portatile e completamente offline progettato per funzionare direttamente da un drive USB su Windows x64. L'architettura è semplice e robusta:

- Un server LLM locale basato su llama.cpp (`llama-server.exe`) che carica modelli GGUF.
- Una UI web leggera avviata localmente (il launcher apre automaticamente il browser predefinito).
- Kiwix per consultare Wikipedia offline (.zim) come risorsa separata.
- Tutto il necessario può essere conservato su un drive USB: runtime, modelli, archivi ZIM.

Ideale per chi desidera un assistente che:
- Funzioni offline (privacy e affidabilità),
- Sia rapido da avviare su Windows x64,
- Permetta di scegliere tra modelli "Fast", "Power" e "Coding".

---

## ⭐ Principali funzionalità

- ✅ Avvio rapido con launcher (`start.bat`)
- ✅ Interfaccia web locale (porta predefinita: 3001)
- ✅ Supporto per più modelli GGUF (Fast / Power / Coding)
- ✅ Kiwix integrato per consultare Wikipedia offline
- ✅ Nessuna dipendenza cloud — tutto locale
- ✅ Riconfigurabile via file JSON in `config/`

---

## 📸 Galleria

![Chat e opzioni modello](https://github.com/user-attachments/assets/4ca4c5a6-0606-4360-a53a-62c5d0f3702c)

> Impostazioni: Modifica system prompt, temperature o cambia modello.

![Integrazione Kiwix](https://github.com/user-attachments/assets/3060ce31-2dfe-45c1-a189-79e83bd56be4)

> Chat: Crea più chat che rimangono salvate finché non spegni il server.

---

## 🚀 Avvio rapido

1. Assicurati di avere Node.js LTS installato: https://nodejs.org/en/download/
2. Scarica e posiziona gli asset esterni (vedi "Asset da scaricare" più sotto).
3. Doppio clic su `start.bat` nella root del progetto.
4. Il launcher avvia il server e apre il browser su `http://localhost:3001` (se la porta è occupata, sceglie automaticamente la successiva libera).
5. Nella UI, scegli il modello (Fast / Power / Coding) e inizia a interagire.

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

> Nota: l'app non legge percorsi come `server/models` o `downloads/knowledge` — usa la struttura sopra.

---

## 📥 Asset da scaricare

1. **Runtime LLM — llama.cpp**
   - Release ufficiale: https://github.com/ggml-org/llama.cpp/releases
   - Per Windows x64 con NVIDIA: scegli la build "Windows x64 (CUDA 12)" se utilizzi GPU.
   - Estrai `llama-server.exe` + DLL in `downloads/runtime/llm/win/`.

2. **Modelli GGUF**
   - Fast: `downloads/models/fast/Phi-3.5-mini-instruct-Q4_K_M.gguf` (circa 2.4 GB)
     Link: https://huggingface.co/goodasdgood/Phi-3.5-mini-instruct-Q4_K_M-GGUF
   - Power: `downloads/models/power/Gemma-4-12B-OBLITERATED-Q4_K_M.gguf` (circa 7.4 GB)
     Link: https://huggingface.co/OBLITERATUS/Gemma-4-12B-OBLITERATED
   - Coding: `downloads/models/coding/gemma4-coding-Q4_K_M.gguf`
     Link: https://huggingface.co/yuxinlu1/gemma-4-12B-coder-fable5-composer2.5-v1-GGUF

   Controlla sempre licenze e checksum sulle pagine dei modelli.

3. **Runtime Kiwix**
   - Scarica Kiwix Tools per Windows: https://download.kiwix.org/release/kiwix-tools/
   - Estrai `kiwix-serve.exe` + DLL in `downloads/runtime/kiwix/win/`.

4. **Archivi Wikipedia `.zim`**
   - Scegli dalla libreria ufficiale: https://library.kiwix.org/
   - O direttamente: https://download.kiwix.org/zim/wikipedia/
   - Copia i file `.zim` in `downloads/wikipedia/`. Kiwix sarà disponibile su porta 8081.

---

## ⚙️ Configurazione

- `config/models.json` — definisce nomi, percorsi e prompt per i modelli.
- `config/ports.json` — porta API (default 3001), LLM (8080), Kiwix (8081). Le porte possono avanzare automaticamente se occupate.

Suggerimento: se cambi percorsi o nomi dei modelli, aggiorna `config/models.json` di conseguenza.

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

## 🙏 Progetto scolastico

---

## 📜 Licenza

Questo repository è distribuito sotto la licenza MIT. Controlla il file `LICENSE` per il testo completo.
