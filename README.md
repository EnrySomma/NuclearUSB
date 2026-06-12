# NuclearUSB

Portable offline AI on a USB drive: local LLMs, browser UI, offline knowledge, document citations, and topic-aware guide surfacing.

> NuclearUSB is a concept/project scaffold for a USB-based offline AI suite that runs on the host machine, exposes a local web interface, and can ground answers in local documents instead of the internet.

---

## Overview

NuclearUSB is designed as a plug-and-play offline toolkit inspired by the idea of an “off-grid knowledge drive.” It is meant to run 2–3 local GGUF models from a USB drive, expose a browser-based UI, optionally use offline knowledge sources such as Wikipedia in ZIM format, and return answers with source references from locally indexed documents.[cite:1][cite:70]

The intended architecture uses local model execution through llama.cpp and HTTP serving through a local server process, while Kiwix is the natural companion for offline ZIM content such as Wikipedia.[web:13][web:47][web:46][web:76]

## Goals

- Run local AI models directly from a portable USB setup.[cite:1]
- Provide a single browser UI for chat, model selection, source panels, and guide suggestions.[cite:3][cite:4]
- Support retrieval-augmented generation from local files with citations like `[S1]`, `[S2]` mapped back to real document metadata.[cite:1]
- Surface related guides automatically for sensitive domains such as medical questions.[cite:1]
- Remain useful even in incomplete or demo mode when binaries, models, or document packs are missing.

## Planned features

| Area | Description |
|---|---|
| Local inference | Run GGUF models through llama.cpp or a compatible local runtime.[web:47][web:78] |
| Web interface | Static HTML/CSS/JS UI for chat, model switching, settings, and status.[cite:70] |
| Offline knowledge | Support ZIM archives via Kiwix and local document collections.[web:46][web:76] |
| Citations | Return grounded answers with source IDs tied to retrieved chunks.[cite:1] |
| Guide surfacing | Show related guides for questions such as first aid or emergency topics.[cite:1] |
| Demo mode | Fall back to placeholders and mock data when real assets are not installed. |

## Repository status

This repository is currently best treated as a **project scaffold / build workspace** rather than a finished end-user product. The repo is meant to host the UI, API glue code, configs, launch scripts, demo indexes, documentation, and placeholder assets, while large binaries and models should usually be excluded from Git and added locally during setup.[cite:3][web:13]

## Proposed stack

- **Inference:** llama.cpp / `llama-server` for local serving and API-compatible model access.[web:13][web:47]
- **Offline knowledge:** Kiwix / `kiwix-serve` for Wikipedia and other ZIM libraries.[web:46][web:76]
- **Frontend:** static HTML, CSS, JavaScript.
- **RAG layer:** local JSON indexes and simple retrieval logic, later replaceable with stronger ranking if needed.[cite:1]
- **Launch strategy:** Windows `.bat`, Linux `.sh`, macOS `.command` scripts.[cite:70]

## Suggested repository structure

```text
NuclearUSB/
├── config/
├── docs/
├── index/
├── knowledge/
│   ├── coding/
│   ├── medical/
│   ├── survival/
│   ├── tech/
│   └── wikipedia/
├── models/
│   ├── coding/
│   ├── fast/
│   └── power/
├── runtime/
│   ├── kiwix/
│   └── llm/
├── scripts/
├── server/
├── tests/
└── ui/
```

This layout matches the intended USB-oriented architecture: runtime binaries, models, web UI, local knowledge, and index files are kept separate so the project can degrade cleanly when some pieces are missing.[cite:3][cite:70]

## What belongs in Git

Recommended to commit:
- UI code
- backend glue code
- configs
- launch scripts
- demo/sample indexes
- placeholder files
- docs
- tests
- `.gitignore`
- repository metadata (`LICENSE`, issue templates, contributing guide)

Recommended **not** to commit:
- large GGUF models
- large ZIM archives
- large PDFs unless explicitly redistributable
- platform binaries unless you are sure the licensing and repo size are acceptable

## Getting started

### 1. Clone the repo

```bash
git clone https://github.com/YOUR-USERNAME/NuclearUSB.git
cd NuclearUSB
```

### 2. Create the expected folders

If they do not already exist:

```bash
mkdir -p config docs index knowledge/{coding,medical,survival,tech,wikipedia} models/{fast,power,coding} runtime/{llm,kiwix} scripts server tests ui
```

### 3. Add local assets

Place local assets in the expected paths:
- GGUF models in `models/`
- llama.cpp binaries in `runtime/llm/`
- Kiwix binaries in `runtime/kiwix/`
- ZIM files in `knowledge/wikipedia/`
- PDF/text documents in `knowledge/...`

### 4. Run in demo mode first

The repo should support a demo/mock mode so the UI and retrieval pipeline can be tested before the real binaries or models are installed. This is especially useful while building the scaffold and validating the citation flow.[cite:1]

## Demo mode vs real mode

### Demo mode

Use demo mode when:
- no GGUF files are installed,
- no llama.cpp runtime is present,
- no Kiwix binaries are present,
- only placeholder knowledge files exist.

Expected behavior:
- the UI still launches,
- `/api/status` returns `mode: mock`,
- retrieval uses sample JSON indexes,
- answers still include valid source IDs from sample content,
- the medical guide panel still works with demo documents.

### Real mode

Use real mode when:
- llama.cpp binaries are available,
- at least one real GGUF model is installed,
- configs point to the correct local paths,
- the knowledge folders contain real files.

Expected behavior:
- the local API talks to the actual model server,
- answers can be generated from real model output,
- citations still come only from retrieved chunks,
- Kiwix serves offline Wikipedia if a valid `.zim` file is present.[web:13][web:46][web:76]

## Core design rules

- Never invent document names, pages, or sections.
- If knowledge mode is enabled, cite only retrieved sources.
- If no relevant sources are found, say so clearly instead of fabricating support.
- For medical topics, show a caution message and surface related guides from the local library.[cite:1]

## Example use cases

- Ask a technical question and get a cited answer from local notes or manuals.
- Ask a first-aid question and see both a grounded answer and related offline guides.[cite:1]
- Browse offline Wikipedia using Kiwix while also chatting with a local model.[web:46][web:76]
- Carry a privacy-preserving offline AI toolkit that does not depend on cloud access.[cite:3][cite:4]

## Models idea

A practical 3-model split previously considered for the project is:
- **Fast** for lightweight general chat,
- **Power** for stronger reasoning,
- **Coding** for software help and debugging.[cite:70]

The exact model family can change over time, but the repo should preserve the abstract interface of `fast`, `power`, and `coding` so the frontend and configs remain stable.[cite:70]

## Offline knowledge idea

Kiwix is built specifically for offline reading of ZIM content such as Wikipedia and related projects, making it a natural fit for the knowledge side of NuclearUSB.[web:46][web:76] The intended workflow is to combine that offline knowledge base with a lightweight retrieval layer over local documents so the assistant can quote local material instead of pretending it knows everything.[cite:1][cite:3]

## Safety note

This project should be treated as an offline information tool, not as a substitute for qualified professional advice. That is especially important for medical, legal, or emergency content, even if the UI surfaces local guides and citations.[cite:1]

## Roadmap

- [ ] Project scaffold with demo mode
- [ ] Static UI with model selector and source panel
- [ ] Local API and retrieval layer
- [ ] Citation mapping and clickable source details
- [ ] Medical guide surfacing
- [ ] Kiwix integration for ZIM browsing
- [ ] llama.cpp real-mode integration
- [ ] Cross-platform launch scripts
- [ ] USB packaging and clean-machine tests

## Contributing

Pull requests, architecture suggestions, UI refinements, retrieval improvements, and portability fixes are welcome. Before opening a PR, read [`CONTRIBUTING.md`](./CONTRIBUTING.md) and check the issue templates.

## License

This repository can use the MIT License if you want a short permissive license that allows broad reuse with minimal conditions.[web:72][web:74]

## Credits / inspiration

- Offline local inference via llama.cpp.[web:47][web:13]
- Offline knowledge access through Kiwix and ZIM content.[web:46][web:76]
- Product direction based on the NuclearUSB concept discussed for an offline AI USB with document-aware citations and guide surfacing.[cite:1][cite:3][cite:4][cite:70]
