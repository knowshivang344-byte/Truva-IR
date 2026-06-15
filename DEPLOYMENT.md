# TRUVA-IR: Deployment, Tunneling, and Run Instructions

This document lists the active public access URLs, code repository hosts, and steps to launch and expose the TRUVA-IR autonomous memory forensics platform.

---

## 1. Quick Reference Links

* **Live Frontend Tunnel (Active Link):** [https://unstopped-serrated-denim.ngrok-free.dev](https://unstopped-serrated-denim.ngrok-free.dev)
* **Flagship Hackathon Replay URL:** [https://unstopped-serrated-denim.ngrok-free.dev/investigate/045147c3-002b-4b98-9f75-538bfadaf3e5?mode=judge](https://unstopped-serrated-denim.ngrok-free.dev/investigate/045147c3-002b-4b98-9f75-538bfadaf3e5?mode=judge)
* **GitHub Code Repository:** [https://github.com/knowshivang344-byte/Truva-IR](https://github.com/knowshivang344-byte/Truva-IR)

---

## 2. Steps to Run the Project Locally

To pull down the code and run the entire TRUVA-IR stack (Frontend, Backend API, Sandboxed Volatility Execution Environment, Redis, and PostgreSQL) on your own machine:

### A. Environment Configuration
Create a `.env` file in the root of the project (`truva-ir/.env`) with the following variables:
```env
PG_PASSWORD=truva_secret_password
GEMINI_API_KEY=YOUR_GEMINI_API_KEY_HERE
EVIDENCE_DIR=./evidence
FORCE_MOCK_SANDBOX=true
FORCE_OSS_MODEL=true
OSS_MODEL=qwen3-coder:480b-cloud
OPENAI_API_KEY=dummy
OPENAI_BASE_URL=http://host.docker.internal:11434/v1
```

### B. Startup Stack
1. Launch all containers:
   ```bash
   docker compose up -d --build
   ```
2. Run database table migrations (against the Postgres container):
   ```bash
   docker compose exec backend alembic upgrade head
   ```
3. Seed SANS Hackathon Flagship Demo trace (Process Hollowing self-correction loop):
   ```bash
   docker compose exec backend python scripts/generate_flagship_trace.py
   ```
4. Access the platform in your browser at:
   * **Frontend Application:** [http://localhost:3000](http://localhost:3000)
   * **Backend API Docs (Swagger):** [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 3. How to Deploy a Working Public Link (100% Free)

To share a working deployment link with hackathon judges or remote testers without needing a paid multi-tunnel ngrok plan:

1. **Start ngrok on port 3000 (Vite Dev Server):**
   ```bash
   ngrok http 3000
   ```
2. **Copy the generated ngrok URL** (e.g. `https://unstopped-serrated-denim.ngrok-free.dev`).
3. **Configure CORS allowed origin:**
   Open `.env` and set `FRONTEND_URL` to your copied ngrok link:
   ```env
   FRONTEND_URL=https://unstopped-serrated-denim.ngrok-free.dev
   ```
4. **Restart the Backend container:**
   ```bash
   docker compose restart backend
   ```
5. **Open the ngrok link** in any browser. Vite's reverse proxy will automatically route all `/api` and `/socket.io` websocket handshakes directly to your backend container, making the app fully functional on one single tunnel link!

---

## 4. How to Test Uploading a File (Using Mock Sandbox)

To test the full autonomous pipeline via file upload without downloading a multi-gigabyte memory image:

1. **Keep Mock Sandbox Active:** Ensure `FORCE_MOCK_SANDBOX=true` is set in `.env` (enabled by default).
2. **Create a Dummy File:** Create any small text file on your machine and rename it to `test.mem` or `dummy.raw` (a 1 KB file is sufficient).
3. **Upload in UI:** On the TRUVA-IR landing page (`http://localhost:3000`), click the **Drag & Drop Memory Dump** area and select your dummy file.
4. **Observe Live Analysis:** The system will upload the file, calculate its hash, launch the sandbox workspace, and automatically progress through the multi-agent pipeline (Planner -> Executor -> Verifier -> Reporter) in real-time until reaching `COMPLETED`.
