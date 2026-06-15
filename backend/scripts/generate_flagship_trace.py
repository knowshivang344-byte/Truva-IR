import asyncio
import uuid
import json
import os
from datetime import datetime
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy import text

# Try to pull DB url from env, fallback to localhost for standalone execution
DB_URL = os.environ.get("DATABASE_URL", "postgresql+asyncpg://truva:secret@localhost:5432/truva")

async def generate_flagship_trace():
    engine = create_async_engine(DB_URL, echo=True)
    async_session = async_sessionmaker(engine, expire_on_commit=False)
    
    async with async_session() as db:
        # Create a mock case
        case_id = uuid.uuid4()
        await db.execute(text("""
            INSERT INTO cases (id, case_name, status, priority) 
            VALUES (:id, :case_name, 'OPEN', 1)
        """), {"id": case_id, "case_name": "Hackathon Flagship Demo"})
        
        # Create mock evidence
        evidence_id = uuid.uuid4()
        await db.execute(text("""
            INSERT INTO evidence_records (id, case_id, filename, volume_path, sha256_hash, file_size_bytes) 
            VALUES (:id, :case_id, :filename, :volume_path, :sha256, 10000)
        """), {"id": evidence_id, "case_id": case_id, "filename": "infected.vmem", "volume_path": "/mnt/evidence/infected.vmem", "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"})
        
        # Create investigation
        investigation_id = uuid.uuid4()
        await db.execute(text("""
            INSERT INTO investigations (id, case_id, evidence_id, status, iteration_count, max_iterations, started_at) 
            VALUES (:id, :case_id, :evidence_id, 'COMPLETED', 2, 3, now())
        """), {"id": investigation_id, "case_id": case_id, "evidence_id": evidence_id})
        
        # Generate the beautiful cinematic event array
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
        
        # Serialize the trace into the database
        replay_id = uuid.uuid4()
        events_json = json.dumps(events)
        await db.execute(text("""
            INSERT INTO investigation_replays (id, investigation_id, name, description, events, created_at)
            VALUES (:id, :inv_id, :name, :desc, :events, now())
        """), {"id": replay_id, "inv_id": investigation_id, "name": "Flagship Process Hollowing Demo", "desc": "SANS Hackathon scenario showing self-correction.", "events": events_json})
        
        await db.commit()
        print(f"✅ Generated Flagship Replay Trace successfully!")
        print(f"Investigation ID: {investigation_id}")

if __name__ == "__main__":
    asyncio.run(generate_flagship_trace())
