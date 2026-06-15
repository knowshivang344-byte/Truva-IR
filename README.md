<div align="center">

# 🔍 TRUVA-IR

### Autonomous Memory Forensics Operating System

> *"Attackers operate at machine speed. Now, so do defenders."*

[![Python](https://img.shields.io/badge/Python-3.11-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-44%25-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-Backend-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-Frontend-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![Docker](https://img.shields.io/badge/Docker-Sandboxed-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://docker.com)
[![Gemini](https://img.shields.io/badge/Gemini_2.5_Flash-AI_Engine-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://deepmind.google/technologies/gemini/)

**Built for the SANS "Find Evil!" Hackathon**

</div>

---

## 🧠 What is TRUVA-IR?

**TRUVA-IR** is an elite, autonomous memory forensics platform that reasons like a senior incident responder — at machine speed. It ingests raw memory dumps (`.mem`, `.raw`) and autonomously investigates them using a multi-agent AI pipeline powered by **Google Gemini 2.5 Flash** and **LangGraph**.

Traditional memory forensics requires hours of manual correlation by senior analysts. TRUVA-IR doesn't just automate commands — it automates **reasoning**. It forms hypotheses, selects the right Volatility3 plugins, interprets results, detects contradictions, self-corrects, and delivers a complete **MITRE ATT&CK-mapped forensic report** — all without human intervention.

---

## ✨ Key Features

| Feature | Description |
|---|---|
| 🤖 **Autonomous LangGraph Orchestration** | A Planner, Executor, Verifier, and Reporter agent collaborate recursively to investigate memory dumps |
| 🔄 **Deterministic Self-Correction** | Verifier cross-references plugin outputs (e.g. `pslist` vs `malfind`) to detect hallucinations and force re-evaluation |
| 🛡️ **Sandboxed Volatility3 Execution** | Real `docker-in-docker` environment with strict timeouts and read-only evidence mounts |
| 🎬 **Cinematic Judge Mode** | Replays serialized LangGraph telemetry millisecond-by-millisecond — watch the AI *think* and self-correct live |
| 📊 **Accuracy Benchmarking** | Integrated ground-truth comparison for True Positives, False Positives, and confidence metrics |
| 📄 **Exportable Intelligence** | One-click JSON, Markdown, and client-side PDF report generation |
| 🔍 **Analyst Explanation Layer** | Full auditability — see *why* the AI made every forensic decision |
| 🔐 **Evidence Integrity** | SHA-256 hashing and read-only mounts for court-admissible forensic integrity |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     TRUVA-IR System                      │
│                                                          │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐           │
│  │ Planner  │───▶│ Executor │───▶│ Verifier │           │
│  │  Agent   │◀───│  Agent   │    │  Agent   │           │
│  └──────────┘    └──────────┘    └────┬─────┘           │
│       ▲               │               │                  │
│       │          Volatility3      Contradiction          │
│  Self-Correct    (Dockerized)      Detection             │
│       │               │               │                  │
│       └───────────────┴───────────────┘                  │
│                        │                                 │
│                   ┌────▼─────┐                           │
│                   │ Reporter │──▶ MITRE ATT&CK Report    │
│                   │  Agent   │──▶ JSON / PDF / Markdown  │
│                   └──────────┘                           │
└─────────────────────────────────────────────────────────┘
```

### Tech Stack

| Layer | Technology |
|---|---|
| **AI Engine** | Google Gemini 2.5 Flash (`langchain-google-genai`) |
| **Orchestration** | LangGraph (Multi-Agent State Machine) |
| **Backend** | Python 3.11, FastAPI, SQLAlchemy, Celery |
| **Database / Cache** | PostgreSQL, Redis |
| **Frontend** | React, Vite, TailwindCSS, Zustand, React Flow |
| **Forensics Runtime** | Volatility3 (Dockerized Sandbox) |
| **Testing** | Playwright |

---

## 🚀 Quick Start

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) & Docker Compose
- A **Google Gemini API Key** ([get one here](https://aistudio.google.com/app/apikey))

### 1. Clone the Repository

```bash
git clone https://github.com/knowshivang344-byte/Truva-IR.git
cd Truva-IR
```

### 2. Configure Environment

```bash
cp .env.example .env
# Open .env and insert your GEMINI_API_KEY
```

### 3. Build & Launch

```bash
docker compose up --build -d
```

### 4. Open the UI

Navigate to **[http://localhost:3000](http://localhost:3000)** in your browser.

### 5. Run the Demo

Click **"SANS Hackathon Demo"** on the dashboard to replay the flagship **Process Hollowing** investigation using Judge Mode.

---

## 🗂️ Project Structure

```
Truva-IR/
├── backend/              # FastAPI server, LangGraph agents, Celery tasks
├── forensic_sandbox/     # Dockerized Volatility3 execution environment
├── frontend/             # React + Vite + TailwindCSS UI
├── tests/                # Playwright end-to-end tests
├── docker-compose.yml    # Full-stack orchestration
├── Makefile              # Convenience commands
├── .env.example          # Environment variable template
├── DEPLOYMENT.md         # Production deployment guide
└── DEMO_SCRIPT.md        # Hackathon demo walkthrough
```

---

## 🤔 How the Agent Pipeline Works

1. **Planner** receives the memory dump and forms an initial threat hypothesis.
2. **Executor** runs the appropriate Volatility3 plugins (e.g., `pslist`, `netscan`, `malfind`) inside the sandboxed Docker environment.
3. **Verifier** cross-references all plugin outputs. If a contradiction is detected (e.g., a process appears in network connections but not in the process list — a classic rootkit indicator), it **fails the iteration** and sends control back to the Planner with a critique.
4. **Planner** self-corrects its hypothesis and retries.
5. **Reporter** synthesizes all validated evidence into a structured report with MITRE ATT&CK technique mappings, confidence scores, and exportable formats.

---

## 🧪 Challenges We Solved

**Preventing AI Hallucinations in Forensics** — In digital forensics, a hallucinated PID or fabricated network connection can compromise an entire investigation. TRUVA-IR implements a dedicated Verification Agent that acts as an adversarial checker. If it detects inconsistency, it blocks the report and forces the Planner to re-examine the evidence.

**Deterministic Replay for Auditability** — We built a serialized telemetry engine that captures every agent state transition, allowing the full reasoning chain to be replayed millisecond-by-millisecond in the frontend — perfect for demonstrations, audits, or post-incident review.

**Structured AI Outputs** — By forcing Gemini to output typed `AnalystReasoning` Pydantic objects (Interpretation, Forensic Significance, Confidence) rather than freeform text, we unlocked reliable UI visualization of the reasoning chain.

---

## 🗺️ Roadmap

- [ ] Integration with live endpoint memory capture (WinPmem)
- [ ] Linux and macOS memory profile support
- [ ] Interactive "pair-programming" chat interface for human analysts mid-investigation
- [ ] CI/CD pipeline with automated regression tests on known malware samples
- [ ] Plugin library expansion (YARA scanning, registry hive analysis)

---

## 📄 License

This project was built for the **SANS "Find Evil!" Hackathon**. See individual file headers for license details.

---

<div align="center">

Made with 🔬 by [knowshivang344-byte](https://github.com/knowshivang344-byte)

*TRUVA-IR — Because evil doesn't announce itself.*

</div>
