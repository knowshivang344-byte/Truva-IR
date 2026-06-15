# TRUVA-IR: Autonomous Memory Forensics

**TRUVA-IR** is an elite, autonomous memory forensics operating system built for the SANS "Find Evil!" Hackathon. Powered by Google Gemini 2.5 Flash and LangGraph, it orchestrates real Volatility3 plugins in a sandboxed Docker environment to detect sophisticated malware, self-correct its hypotheses, and generate validated forensic narratives at machine speed.

## Why TRUVA-IR Matters
Attackers operate at machine speed. Defenders are drowning in alerts and memory dumps that take hours to parse manually. 
TRUVA-IR doesn't just automate commands—it automates **reasoning**. It prioritizes *validation over blind automation*, employing a multi-agent verification engine to catch hallucinations, downgrade weak indicators, and guarantee forensic integrity.

## Core Features
1. **Autonomous LangGraph Orchestration**: A Planner, Executor, Verifier, and Reporter agent collaborate recursively to investigate memory dumps.
2. **Deterministic Self-Correction**: The Verifier cross-references plugin outputs (e.g. `pslist` vs `malfind`) to detect contradictions, forcing the Planner to re-evaluate failed hypotheses.
3. **Authentic Volatility3 Execution**: Real `docker-in-docker` execution environment with strict timeouts and read-only evidence mounts.
4. **Cinematic Judge Mode**: A frontend state engine that replays serialized telemetry traces millisecond-by-millisecond for reliable, immersive demonstrations.
5. **Accuracy Benchmarking**: Integrated ground-truth comparison for calculating True Positives, False Positives, and confidence accuracy metrics on the fly.
6. **Exportable Intelligence**: One-click generation of JSON, Markdown, and client-side PDF investigation reports.

## Architecture Stack
- **AI Engine**: Google Gemini 2.5 Flash (via `langchain-google-genai`)
- **Orchestration**: LangGraph (Multi-Agent State Machine)
- **Backend**: Python 3.11, FastAPI, SQLAlchemy, PostgreSQL, Redis, Celery
- **Frontend**: React, Vite, TailwindCSS, Zustand, React Flow
- **Forensics**: Volatility3 (Dockerized Sandboxing)

## Quick Start
1. **Environment Setup**:
   Copy `.env.example` to `.env` and insert your `GEMINI_API_KEY`.
2. **Build and Run**:
   ```bash
   docker compose up --build -d
   ```
3. **Access OS**:
   Open `http://localhost:3000` in your browser.
4. **Judge Mode Demo**:
   Click "SANS Hackathon Demo" on the dashboard to replay the flagship Process Hollowing investigation.
