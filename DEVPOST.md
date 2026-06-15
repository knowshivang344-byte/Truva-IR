# TRUVA-IR: Autonomous Memory Forensics Operating System

## Inspiration
Attackers are moving faster than ever, deploying fileless malware and in-memory rootkits that bypass traditional EDR. Memory forensics (via tools like Volatility) is the ultimate source of truth, but it requires senior-level expertise and hours of painstaking manual correlation. We built TRUVA-IR to level the playing field, creating an autonomous agent that reasons like a senior analyst at machine speed.

## What it does
TRUVA-IR ingests raw memory dumps (`.mem`, `.raw`) and autonomously investigates them. It forms hypotheses, decides which Volatility3 plugins to run, interprets the structured JSON output, cross-correlates evidence to catch contradictions, and generates a polished, MITRE ATT&CK-mapped executive report. 

Crucially, it features an **Analyst Explanation Layer** that exposes *why* the AI made every decision, prioritizing validation and auditability over black-box automation.

## How we built it
- **Gemini 2.5**: Powered by Gemini 2.5 Flash for lightning-fast, structured reasoning.
- **LangGraph**: Orchestrates a 4-agent state machine (Planner, Executor, Verifier, Reporter) with a recursive self-correction loop.
- **Docker-in-Docker Sandbox**: Securely executes Volatility3 commands against read-only mounted evidence.
- **PostgreSQL & Redis**: Persists evidence traceability, reasoning chains, and full telemetry replays.
- **React & Zustand**: A cinematic frontend that visualizes the AI's internal thought process and includes a deterministic "Judge Mode" playback engine.

## Challenges we ran into
Preventing AI hallucinations in digital forensics is critical. If an agent hallucinates a PID, the entire investigation is compromised. We solved this by implementing a dedicated **Verification Agent** that acts as an adversarial checker. If it detects a hallucination or contradiction (e.g., a process exists in `netscan` but not `pslist` without a rootkit explanation), it fails the iteration and forces the Planner to self-correct.

## Accomplishments that we're proud of
- Our **Cinematic Judge Mode**: Building a deterministic replay engine that visualizes the raw telemetry of the LangGraph execution so judges can watch the AI "think" and self-correct in real-time.
- **Client-side PDF Generation**: Implementing robust export functionality without bloating the backend Docker image.
- **Evidence Integrity**: Enforcing read-only mounts and SHA-256 hashing to guarantee court-admissible forensic integrity.

## What we learned
Building stateful, multi-agent systems requires strict Pydantic schemas. Relying on LLMs to output unstructured text breaks downstream tools. By forcing Gemini to output structured `AnalystReasoning` objects (Interpretation, Forensic Significance, Confidence), we unlocked the ability to visualize the reasoning chain in the UI.

## What's next for TRUVA-IR
- Integration with live endpoint memory capture tools (e.g., WinPmem).
- Expanding the plugin library to support Linux and macOS memory profiles.
- Implementing an interactive chat interface where human analysts can "pair-program" with the agents mid-investigation.
