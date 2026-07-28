# ☢️ NuclearUSB — Portable Offline AI & Knowledge Suite

NuclearUSB is a portable offline AI and knowledge system designed to run from a 128 GB USB drive. It is intended for disaster management, network-isolated environments, off-grid operations, field deployments, and privacy-focused local workflows.

The project combines local LLM inference, offline knowledge archives, and a lightweight browser-based interface into a single portable environment.

[![Project Status: Ready for Demo](https://img.shields.io/badge/Status-Ready%20for%20Demo-yellow.svg)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](#)
[![Version](https://img.shields.io/badge/Version-0.1.0-green.svg)](#)
[![Platform Compatibility](https://img.shields.io/badge/Platform-Windows-lightgrey.svg)](#)

---

## 📖 Table of Contents

1. [Overview](#overview)
2. [Key Features](#key-features)
3. [Project Architecture](#project-architecture)
4. [Repository Structure](#repository-structure)
5. [Quickstart](#quickstart)
6. [Real Mode Setup](#real-mode-setup)
7. [Kiwix and Offline Knowledge](#kiwix-and-offline-knowledge)
8. [Testing](#testing)
9. [USB Deployment Notes](#usb-deployment-notes)
10. [Roadmap](#roadmap)
11. [License](#license)

---

## Overview

**NuclearUSB** is a plug-and-play offline AI toolkit built around the idea of a portable local intelligence workstation.

The system is designed to:

- run local GGUF language models,
- provide a browser-based interface,
- operate without internet connectivity,
- serve offline knowledge archives,
- run directly from removable storage.

The repository supports two operating modes:

- **Demo Mode** — runs with placeholder assets and simulated responses.
- **Real Mode** — runs with local inference binaries, real GGUF models, and offline knowledge databases.

---

## Key Features

- **Triple-model local AI suite**
  - Fast lightweight assistant.
  - Strong general-purpose reasoning model.
  - Coding-focused model.

- **Fully offline operation**
  - No cloud API dependency.
  - No external services required.

- **Local GGUF inference**
  - Powered by `llama.cpp`.
  - Runs models directly on the host machine.

- **Offline knowledge access**
  - Supports `.zim` archives through Kiwix.
  - Enables access to offline libraries such as Wikipedia.

- **Portable USB deployment**
  - Designed for removable storage.
  - Keeps runtime, models, and knowledge assets self-contained.

- **Graceful fallback**
  - Can operate in demo mode when real assets are missing.

---

## Project Architecture

```text
                   ┌─────────────────────────────┐
                   │           Static UI         │
                   │      HTML/CSS/Vanilla JS    │
                   └───────────────┬─────────────┘
                                   │ HTTP
                                   ▼
                   ┌─────────────────────────────┐
                   │       Local API Server      │
                   │      UI + service routes    │
                   └───────────────┬─────────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    │                             │
                    ▼                             ▼
        ┌───────────────────┐        ┌────────────────────┐
        │   LLM Controller  │        │ Offline Knowledge  │
        │   llama.cpp API   │        │     Kiwix/ZIM      │
        └─────────┬─────────┘        └────────────────────┘
                  │
                  ▼
        ┌───────────────────┐
        │    GGUF Models    │
        │ fast/power/coding │
        └───────────────────┘
```

The local AI runtime is based on `llama.cpp`, while Kiwix provides access to offline knowledge archives.

---

## Repository Structure

```text
NuclearUSB/
├── config/                  # Application configuration
│   ├── app.json             # General settings
│   ├── models.json          # Model definitions
│   └── ports.json           # Service ports
│
├── docs/                     # Documentation
│   ├── ARCHITECTURE.md
│   ├── QUICKSTART.md
│   ├── MISSING_ASSETS.md
│   ├── TESTING.md
│   ├── REAL_DEPLOYMENT_NOTES.md
│   └── SETUP_REAL_ASSETS.md
│
├── knowledge/                # Offline knowledge files
│   └── wikipedia/
│
├── models/                   # GGUF model files
│   ├── coding/
│   ├── fast/
│   └── power/
│
├── runtime/                  # Local executables
│   ├── llm/                  # llama.cpp runtime
│   └── kiwix/                # Kiwix tools
│
├── scripts/                  # Launch scripts
│   └── launch-windows.bat
│
├── server/                   # Local API server
├── tests/                    # Automated tests
├── ui/                       # Frontend interface
└── README.md
```

The structure separates:

- runtime binaries,
- AI models,
- offline knowledge,
- application logic,
- user interface.

---

## Quickstart

Run NuclearUSB in demo mode without downloading large assets.

### Requirements

- Node.js 18+
- Modern web browser

### Start

Clone the repository:

```bash
git clone https://github.com/YOUR-USERNAME/NuclearUSB.git
cd NuclearUSB
```

Check Node.js:

```bash
node -v
```

Start the server:

```bash
node server/index.js
```

Open:

```text
http://localhost:3001
```

---

## Real Mode Setup

Real Mode enables local inference using llama.cpp and GGUF models.

### 1. llama.cpp Runtime

Expected executable:

```text
downloads/runtime/llm/win/llama-server.exe
```

Required DLL files should remain in the same directory:

```text
llama.dll
ggml.dll
ggml-cuda.dll
cudart64_12.dll
cublas64_12.dll
cublasLt64_12.dll
```

Windows must be able to resolve these dependencies from the runtime folder.

### 2. GGUF Models

Configured model locations:

```text
downloads/models/fast/Phi-3.5-mini-instruct-Q4_K_M.gguf
downloads/models/power/Gemma-4-12B-OBLITERATED-Q4_K_M.gguf
downloads/models/coding/gemma4-coding-Q4_K_M.gguf
```

Default GPU configuration:

```text
gpu_layers = 0
```

Increase GPU layers only after verifying:

- GPU compatibility,
- drivers,
- CUDA runtime,
- available VRAM.

---

## Kiwix and Offline Knowledge

Kiwix provides offline access to `.zim` knowledge archives.

Expected executable:

```text
downloads/runtime/kiwix/win/kiwix-serve.exe
```

Expected knowledge location:

```text
downloads/knowledge/wikipedia/*.zim
```

Example:

```bash
kiwix-serve --port=8081 downloads/knowledge/wikipedia/library.zim
```

Open:

```text
http://localhost:8081
```

---

## Testing

Run automated checks:

```bash
node tests/test_config.js
node tests/test_api.js
```

Recommended manual checks:

- UI loads correctly.
- Local API responds.
- Model switching works.
- llama.cpp runtime starts correctly.
- Kiwix serves offline archives.
- Missing assets produce clear fallback messages.

---

## USB Deployment Notes

Recommended:

- Use **exFAT** for compatibility.
- Prefer USB 3.x storage.
- Keep large models outside Git history.
- Test on a clean machine before field deployment.

Large GGUF models and `.zim` archives should normally be distributed separately from the source repository.

---

## Roadmap

- [x] Demo-ready scaffold
- [x] Local UI
- [x] Configuration system
- [ ] Stable llama.cpp integration
- [ ] Multi-model switching
- [ ] Kiwix automation
- [ ] USB-first packaging
- [ ] Offline field deployment testing

---

## License

This project is licensed under the **MIT License**.
