import uuid
import json
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Auto-initialize SQLite database if running locally
    from src.db.session import engine, AsyncSessionLocal
    from src.models import Base
    
    if engine.url.drivername.startswith("sqlite"):
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        print("SQLite Database initialized and tables created.")
        
        # Auto-seed Flagship Demo if database is empty
        from sqlalchemy import select
        from src.models.replays import InvestigationReplay
        from src.models.cases import Case
        from src.models.evidence import EvidenceRecord
        from src.models.investigations import Investigation
        
        async with AsyncSessionLocal() as session:
            result = await session.execute(select(InvestigationReplay).where(InvestigationReplay.name == "Flagship Process Hollowing Demo").limit(1))
            replay = result.scalar_one_or_none()
            if not replay:
                print("Seeding Flagship Process Hollowing Demo into SQLite database...")
                case_id = uuid.uuid4()
                case = Case(id=case_id, case_name="Hackathon Flagship Demo", status="OPEN", priority=1)
                session.add(case)
                
                evidence_id = uuid.uuid4()
                evidence = EvidenceRecord(
                    id=evidence_id,
                    case_id=case_id,
                    filename="infected.vmem",
                    sha256_hash="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
                    file_size_bytes=10000,
                    volume_path="/mnt/evidence/infected.vmem"
                )
                session.add(evidence)
                
                investigation_id = uuid.uuid4()
                investigation = Investigation(
                    id=investigation_id,
                    case_id=case_id,
                    evidence_id=evidence_id,
                    status="COMPLETED",
                    iteration_count=2,
                    max_iterations=3
                )
                session.add(investigation)
                
                events = [
                    {"offset_ms": 1000, "type": "agent:state_change", "payload": {"agent": "planner", "status": "active"}},
                    {"offset_ms": 3000, "type": "agent:state_change", "payload": {"agent": "planner", "status": "idle"}},
                    {"offset_ms": 3500, "type": "agent:state_change", "payload": {"agent": "executor", "status": "active"}},
                    {"offset_ms": 4000, "type": "plugin:running", "payload": {"plugin": "windows.pslist.PsList"}},
                    {"offset_ms": 7000, "type": "plugin:completed", "payload": {"plugin": "windows.pslist.PsList", "parsed": [{"PID": 444, "Name": "svchost.exe"}], "exit_code": 0}},
                    {"offset_ms": 7500, "type": "agent:state_change", "payload": {"agent": "executor", "status": "idle"}},
                    {"offset_ms": 8000, "type": "agent:state_change", "payload": {"agent": "verifier", "status": "active"}},
                    {"offset_ms": 10000, "type": "finding:created", "payload": {"id": str(uuid.uuid4()), "title": "Standard svchost running", "severity": "INFO", "confidence_score": 0.4, "is_hallucination": False, "reasoning_chain": {"interpretation": "pslist shows standard execution.", "forensic_significance": "No immediate signs of malicious behavior.", "confidence_justification": "Only single artifact present."}}},
                    {"offset_ms": 10500, "type": "investigation:confidence", "payload": 0.40},
                    {"offset_ms": 11000, "type": "agent:state_change", "payload": {"agent": "verifier", "status": "idle"}},
                    
                    # The Judge Moment! Contradiction/Confidence Drop
                    {"offset_ms": 12000, "type": "judge:moment", "payload": {"type": "CONTRADICTION", "message": "Low confidence detected. No malicious vectors identified. Triggering Self-Correction loop."}},
                    
                    # Replanning
                    {"offset_ms": 14000, "type": "agent:state_change", "payload": {"agent": "planner", "status": "active"}},
                    {"offset_ms": 16000, "type": "agent:state_change", "payload": {"agent": "planner", "status": "idle"}},
                    {"offset_ms": 16500, "type": "agent:state_change", "payload": {"agent": "executor", "status": "active"}},
                    {"offset_ms": 17000, "type": "plugin:running", "payload": {"plugin": "windows.malfind.Malfind"}},
                    {"offset_ms": 21000, "type": "plugin:completed", "payload": {"plugin": "windows.malfind.Malfind", "parsed": [{"PID": 444, "Process": "svchost.exe", "Protection": "PAGE_EXECUTE_READWRITE"}], "exit_code": 0}},
                    {"offset_ms": 21500, "type": "agent:state_change", "payload": {"agent": "executor", "status": "idle"}},
                    {"offset_ms": 22000, "type": "agent:state_change", "payload": {"agent": "verifier", "status": "active"}},
                    {"offset_ms": 25000, "type": "finding:created", "payload": {"id": str(uuid.uuid4()), "title": "Injected Code in svchost.exe (Process Hollowing)", "severity": "CRITICAL", "confidence_score": 0.95, "is_hallucination": False, "reasoning_chain": {"interpretation": "Malfind detected a memory segment marked as PAGE_EXECUTE_READWRITE inside svchost.exe without a backing file on disk.", "forensic_significance": "This is a definitive signature of Process Hollowing or DLL Injection.", "confidence_justification": "Confirmed by RWX protection mask across multiple VAD blocks."}}},
                    {"offset_ms": 25500, "type": "investigation:confidence", "payload": 0.95},
                    
                    # Another Judge Moment! Recovery
                    {"offset_ms": 26000, "type": "judge:moment", "payload": {"type": "SELF_CORRECTION", "message": "Self-correction successful. Malicious RWX injection validated."}},
                    {"offset_ms": 27000, "type": "agent:state_change", "payload": {"agent": "verifier", "status": "idle"}},
                    
                    # Reporting
                    {"offset_ms": 27500, "type": "agent:state_change", "payload": {"agent": "reporter", "status": "active"}},
                    {"offset_ms": 32000, "type": "report:complete", "payload": {"executive_summary": "An autonomous investigation confirmed a Process Hollowing attack inside svchost.exe (PID 444). The system initially hypothesized normal behavior but successfully self-corrected to scan for unbacked RWX memory.", "mitre_attack_summary": ["T1055.012 Process Hollowing", "T1055 Process Injection"]}},
                    {"offset_ms": 32500, "type": "agent:state_change", "payload": {"agent": "reporter", "status": "idle"}},
                ]
                
                replay_id = uuid.uuid4()
                investigation_replay = InvestigationReplay(
                    id=replay_id,
                    investigation_id=investigation_id,
                    name="Flagship Process Hollowing Demo",
                    description="SANS Hackathon scenario showing self-correction.",
                    events=events
                )
                session.add(investigation_replay)
                await session.commit()
                print("Seeding complete.")
    yield

app = FastAPI(
    title="TRUVA-IR API",
    description="Autonomous DFIR Memory Forensics Platform",
    version="1.0.0",
    lifespan=lifespan
)
import os
cors_origins = ["http://localhost:3000", "http://127.0.0.1:3000"]
env_origins = os.getenv("CORS_ORIGINS")
if env_origins:
    cors_origins.extend([o.strip() for o in env_origins.split(",")])
elif os.getenv("FRONTEND_URL"):
    cors_origins.append(os.getenv("FRONTEND_URL"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

from src.api.routers import cases, evidence, investigations
app.include_router(cases.router, prefix="/api/v1")
app.include_router(evidence.router, prefix="/api/v1")
app.include_router(investigations.router, prefix="/api/v1")

import socketio
from src.api.websockets.relay import sio, wrap_socket_app

asgi_app = wrap_socket_app(socketio.ASGIApp(sio, other_asgi_app=app))

