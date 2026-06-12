# ☢️ NuclearUSB — Portable Offline AI & Knowledge Suite

NuclearUSB is a portable offline AI and knowledge system designed to live on a 128 GB USB drive. It is intended for disaster management, network-isolated environments, off-grid use, field operations, and privacy-conscious local workflows, combining local LLMs, retrieval-augmented generation from local files, and offline knowledge access in a single repository-driven setup.

[![Project Status: Ready for Demo](https://img.shields.io/badge/Status-Ready%20for%20Demo-yellow.svg)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](#)
[![Version](https://img.shields.io/badge/Version-0.1.0-green.svg)](#)
[![Platform Compatibility](https://img.shields.io/badge/Platform-Windows%20%7C%20Linux%20%7C%20macOS-lightgrey.svg)](#)

---

## 📖 Table of Contents

1. [Overview](#overview)
2. [Key Features](#key-features)
3. [Project Architecture](#project-architecture)
4. [Repository Structure](#repository-structure)
5. [RAG and Search Logic](#rag-and-search-logic)
6. [Quickstart](#quickstart)
7. [Real Mode Setup](#real-mode-setup)
8. [Kiwix and Offline Knowledge](#kiwix-and-offline-knowledge)
9. [Testing](#testing)
10. [USB Deployment Notes](#usb-deployment-notes)
11. [Roadmap](#roadmap)
12. [License](#license)

---

## Overview

**NuclearUSB** is a plug-and-play offline AI toolkit and knowledge retrieval repository built around the idea of a USB-based portable intelligence suite. The project is designed to run local GGUF models, provide a browser-based UI, retrieve information from indexed local documents, show grounded citations, and optionally integrate offline knowledge archives such as Wikipedia through Kiwix.

The repository is structured to support both:
- **Demo mode**, where the project works with placeholder assets and mock responses.
- **Real mode**, where local binaries, GGUF models, and offline knowledge files are installed and used directly.

---

## Key Features

- **Triple-model suite:** run specialized local models for fast chat, stronger reasoning, and coding assistance.
- **Grounded RAG engine:** search local indexed documents, rank relevant chunks, and map answers to explicit citations such as `[S1]` and `[S2]`.
- **Medical guide dispatcher:** detect medical queries, show a warning/disclaimer, and surface relevant local first-aid guides [cite:1].
- **Offline knowledge integration:** support `.zim` archives and offline libraries through Kiwix, which is built for reading and serving offline knowledge content.
- **Graceful fallback behavior:** remain usable in demo mode even if model files or runtime binaries are missing.
- **Cross-platform launch system:** support Windows, Linux, and macOS through local launch scripts.

---

## Project Architecture

```text
                   ┌───────────────────────────────────────┐
                   │               Static UI               │
                   │       (HTML/CSS/Vanilla JS SPA)       │
                   └───────────────────┬───────────────────┘
                                       │ HTTP Requests
                                       ▼
                   ┌───────────────────────────────────────┐
                   │          Local API Server             │
                   │   (Serves UI & handles REST routes)   │
                   └────────┬─────────────────────┬────────┘
                            │                     │
            ┌───────────────▼───────┐     ┌───────▼───────────────┐
            │   Retrieval Engine    │     │      LLM Client       │
            │ - keyword scoring     │     │  llama.cpp integration│
            │ - category detection  │     └───────────┬───────────┘
            │ - source packaging    │                 │
            └───────────────┬───────┘                 │ HTTP / health / v1
                            │                         ▼
                   ┌────────▼────────┐    ┌───────────────────────┐
                   │  JSON Index DB  │    │  llama.cpp runtime    │
                   │   (index/*.json)│    │   local model server  │
                   └─────────────────┘    └───────────┬───────────┘
                                                      │
                                                      ▼
                                          ┌───────────────────────┐
                                          │   Local GGUF Models   │
                                          │  (models/*/*.gguf)    │
                                          └───────────────────────┘
```

The local model runtime is intended to be based on `llama.cpp`, which provides local inference and server tooling, while Kiwix is the intended companion for serving offline `.zim` knowledge archives such as Wikipedia.

---

## Repository Structure

```text
NuclearUSB/
├── config/                  # Configuration mappings
│   ├── app.json             # Medical keywords, disclaimers, citation rules
│   ├── models.json          # GGUF paths, parameters, context sizes
│   └── ports.json           # Service port numbers
├── docs/                    # Architectural and setup guides
│   ├── ARCHITECTURE.md
│   ├── QUICKSTART.md
│   ├── MISSING_ASSETS.md
│   ├── TESTING.md
│   ├── REAL_DEPLOYMENT_NOTES.md
│   └── SETUP_REAL_ASSETS.md
├── index/                   # RAG indexes (chunked JSON documents)
│   ├── coding.json
│   ├── medical.json
│   ├── survival.json
│   └── tech.json
├── knowledge/               # Raw reference materials
│   ├── coding/
│   ├── medical/
│   ├── survival/
│   ├── tech/
│   └── wikipedia/
├── models/                  # GGUF model directories
│   ├── coding/
│   ├── fast/
│   └── power/
├── runtime/                 # Platform runtime binaries
│   ├── llm/                 # llama.cpp server binaries
│   └── kiwix/               # Kiwix tools / kiwix-serve binaries
├── scripts/                 # OS-specific launchers
│   ├── launch-windows.bat
│   ├── launch-linux.sh
│   └── launch-mac.command
├── server/                  # API server and retrieval logic
├── tests/                   # Automated and manual test files
├── ui/                      # Single-page frontend
└── README.md
```

This structure is intentionally split between **runtime**, **knowledge**, **index**, **models**, and **UI** so the repository can work as a scaffold first and later become a real USB-deployable package.

---

## RAG and Search Logic

The retrieval system is designed to stay simple, inspectable, and local-first.

1. **Tokenization and cleaning**  
   The query is normalized, lowercased, and split into terms for local matching.

2. **Weighted scoring**  
   Retrieved chunks are ranked against metadata fields such as title, tags, section, and body text.

3. **Query classification**  
   The query is classified into categories such as `medical`, `survival`, `tech`, `coding`, or `general`.

4. **Source packaging**  
   The top results are assigned deterministic source IDs like `[S1]`, `[S2]`, and returned with metadata for the UI.

5. **Medical warning dispatch**  
   If the query is medical, the system adds a warning/disclaimer and surfaces relevant guides from the medical knowledge folder.

The key rule is simple: **citations must come only from retrieved chunks**. If no supporting chunks are found, the system should avoid fake grounding and say so clearly.

---

## Quickstart

Get the project running in **demo mode** without downloading real models first.

### Prerequisites

- **Node.js 18+** recommended for the local server scaffold.
- A modern browser.

### Run the project

1. Clone the repository:

```bash
git clone https://github.com/YOUR-USERNAME/NuclearUSB.git
cd NuclearUSB
```

2. Check Node.js:

```bash
node -v
```

3. Start the local server:

```bash
node server/index.js
```

4. Open the interface in your browser:

```text
http://localhost:3001
```

5. Test a grounded query, for example:
- `How do I treat a minor burn?`
- `Explain TCP handshake`
- `Show me coding help for a JavaScript fetch request`

In demo mode, the system should still be able to:
- load the UI,
- answer using local sample indexes,
- show citations,
- trigger medical guide surfacing where relevant [cite:1].

---

## Real Mode Setup

To switch from demo mode to real local inference, install the runtime binaries and model files locally.

### 1. Install llama.cpp runtime

Download the appropriate runtime build from the official releases page:

- [llama.cpp Releases](https://github.com/ggml-org/llama.cpp/releases)

Place the binaries in the expected runtime folders:

- **Windows:** `runtime/llm/win/`
- **Linux:** `runtime/llm/linux/`
- **macOS:** `runtime/llm/mac/`

The project is intended to use `llama-server` as the local model-serving component, because `llama.cpp` provides server functionality for local inference workflows.

### 2. Install GGUF models

Suggested model layout:

- **Fast:** `Phi-3.5-mini-instruct.Q4_K_M.gguf`
- **Power:** `Mistral-7B-Instruct-v0.3.Q4_K_M.gguf`
- **Coding:** `Qwen2.5-Coder-7B-Instruct.Q4_K_M.gguf`

Place them in:

- `models/fast/`
- `models/power/`
- `models/coding/`

### 3. Restart the launcher

Run your platform launcher from `scripts/` again. If binaries and models are correctly installed, the UI should report a real/local-ready state instead of demo mode.

---

## Kiwix and Offline Knowledge

Kiwix is the intended offline knowledge component for NuclearUSB. It is designed to provide access to offline educational and reference content, including Wikipedia and other `.zim` libraries, without requiring internet access.

### What to install

Download Kiwix or Kiwix Tools from:

- [Kiwix Applications](https://kiwix.org/en/applications/)

For NuclearUSB, the most relevant tool is:

- **`kiwix-serve`** — used to serve `.zim` files locally over HTTP.

### Suggested folder placement

- **Windows:** `runtime/kiwix/win/`
- **Linux:** `runtime/kiwix/linux/`
- **macOS:** `runtime/kiwix/mac/`

### Example command

```bash
kiwix-serve --port=8081 knowledge/wikipedia/wikipedia_it_all_maxi_2024-10.zim
```

Then open:

```text
http://localhost:8081
```

This lets NuclearUSB complement model answers with a true offline knowledge layer instead of relying only on model memory.

---

## Testing

Use the built-in tests to verify config alignment, retrieval behavior, and API responses.

```bash
node tests/test_config.js
node tests/test_retrieval.js
node tests/test_api.js
```

Recommended manual checks:

- The UI loads without crashing.
- `/api/status` returns a coherent state object.
- Model switching updates the active model.
- A medical query shows warning + guides.
- A non-medical query does not trigger the medical panel.
- Citations appear only when supporting chunks are found.

---

## USB Deployment Notes

- **Use exFAT** for cross-platform compatibility and large files.
- Prefer **USB 3.0 / 3.1** ports for faster runtime and model loading.
- Keep large assets out of Git and copy them locally during deployment.
- Test on a clean machine before treating the USB build as portable-ready.

Because GGUF models and `.zim` archives can be large, this repository should usually version the scaffold and documentation while the heavy runtime assets are added locally or distributed separately.

---

## Roadmap

- [ ] Demo-ready scaffold
- [ ] Stable local API and UI
- [ ] Deterministic citation mapping
- [ ] Medical guide surfacing
- [ ] Kiwix integration
- [ ] llama.cpp real-mode integration
- [ ] Cross-platform launcher hardening
- [ ] USB-first packaging and testing

---

## License

This project is licensed under the **MIT License**.
