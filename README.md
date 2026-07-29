# NuclearUSB

Assistente AI portatile e offline per Windows x64. Il progetto usa llama.cpp per i modelli locali e Kiwix come risorsa Wikipedia autonoma. Non serve una connessione Internet mentre l’app è in esecuzione.

## Avvio rapido

1. Verifica di avere Node.js LTS installato. Link ufficiale diretto: [nodejs.org/en/download](https://nodejs.org/en/download/).
2. Prepara gli asset esclusi dal repository seguendo la sezione [Asset da scaricare](#asset-da-scaricare).
3. Fai doppio clic su `start.bat`.
4. Il launcher avvia il server e apre automaticamente Chrome sulla porta effettiva. Normalmente è `http://localhost:3001`; se la porta è occupata, NuclearUSB sceglie la successiva libera e apre quella corretta.

## Struttura degli asset locali

Gli asset binari e i modelli sono esclusi da GitHub per dimensioni e licenze. La struttura deve essere:

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

Non usare `server/models` o `downloads/knowledge`: non sono percorsi utilizzati dall’app.

## Asset da scaricare

### 1. Runtime LLM: llama.cpp

Scarica la release ufficiale da [GitHub llama.cpp Releases](https://github.com/ggml-org/llama.cpp/releases). Per un PC Windows x64 con GPU NVIDIA scegli l’archivio **Windows x64 (CUDA 12)** e le DLL CUDA 12.4 abbinate. Per un PC senza CUDA scegli **Windows x64 (CPU)**.

Estrai il contenuto in:

```text
downloads/runtime/llm/win/
```

Il file indispensabile è `llama-server.exe`; lascia nella stessa cartella tutte le DLL estratte. Il launcher usa automaticamente il modello selezionato e avvia il server sulla porta configurata.

### 2. Modelli GGUF

Scarica il file Q4_K_M indicato e rinominalo esattamente come nella tabella prima di copiarlo:

| Modello | File richiesto | Link diretto |
| --- | --- | --- |
| Fast | `downloads/models/fast/Phi-3.5-mini-instruct-Q4_K_M.gguf` | [Phi-3.5-mini GGUF su Hugging Face](https://huggingface.co/goodasdgood/Phi-3.5-mini-instruct-Q4_K_M-GGUF/blob/main/phi-3.5-mini-instruct-q4_k_m.gguf) |
| Power | `downloads/models/power/Gemma-4-12B-OBLITERATED-Q4_K_M.gguf` | [Gemma 4 Obliterated Q4_K_M su Hugging Face](https://huggingface.co/OBLITERATUS/Gemma-4-12B-OBLITERATED/blob/main/Gemma-4-12B-OBLITERATED-Q4_K_M.gguf) |
| Coding | `downloads/models/coding/gemma4-coding-Q4_K_M.gguf` | [Gemma 4 Coder Q4_K_M su Hugging Face](https://huggingface.co/yuxinlu1/gemma-4-12B-coder-fable5-composer2.5-v1-GGUF) |

I file dei modelli sono grandi: servono circa 2,4 GB per Fast e 7,4 GB per Power/Coding. Controlla sempre licenza e checksum sulla pagina del modello prima di distribuirli.

### 3. Runtime Kiwix

Scarica [Kiwix Tools per Windows](https://download.kiwix.org/release/kiwix-tools/), estrai `kiwix-serve.exe` e tutte le DLL in:

```text
downloads/runtime/kiwix/win/
```

Kiwix resta un browser offline indipendente: non viene usato per indicizzare o recuperare risposte della chat.

### 4. Archivi Wikipedia `.zim`

Scegli gli archivi dalla [libreria ufficiale Kiwix](https://library.kiwix.org/) oppure dall’[indice diretto degli archivi Wikipedia](https://download.kiwix.org/zim/wikipedia/). Copia uno o più file `.zim` direttamente in:

```text
downloads/wikipedia/
```

Al riavvio, il pulsante **Wikipedia** apre Kiwix sulla porta `8081`. Gli archivi rimangono esclusivamente una risorsa offline separata dalla chat.

## Configurazione

- `config/models.json`: nomi, percorsi e prompt dei tre modelli.
- `config/ports.json`: porta API `3001`, LLM `8080`, Kiwix `8081`.
- La porta API e quella LLM possono avanzare automaticamente se risultano occupate.

## Verifica

Con il server attivo:

```powershell
node tests/test_config.js
node tests/test_api.js
```

La UI mantiene topbar, cronologia e composer nelle proprie regioni; solo l’area centrale dei messaggi scorre verticalmente. Il cambio tra Fast, Power e Coding attende il caricamento del modello e non ricade in DEMO quando il runtime locale è disponibile.

## Requisiti e licenze

- Windows 10/11 x64.
- Node.js LTS.
- Spazio libero sufficiente per runtime, modelli e archivi ZIM.
- Driver NVIDIA aggiornati se si usa la build CUDA.

I binari, i modelli e gli archivi ZIM hanno licenze proprie: consultare sempre le rispettive pagine ufficiali prima della redistribuzione.
