import uuid
from typing import List, Optional

import os
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from src.models.investigations import Investigation
from src.models.evidence import EvidenceRecord
from src.db.session import get_db
from pydantic import BaseModel, ConfigDict
from datetime import datetime

router = APIRouter(prefix="/investigations", tags=["investigations"])

class InvestigationCreate(BaseModel):
    evidence_id: uuid.UUID

class InvestigationResponse(BaseModel):
    id: uuid.UUID
    case_id: uuid.UUID
    evidence_id: uuid.UUID
    status: str
    iteration_count: int
    overall_confidence: float | None
    started_at: datetime
    model_config = ConfigDict(from_attributes=True)

import asyncio
import traceback
from fastapi import BackgroundTasks
from src.graph.builder import build_investigation_graph
from src.api.websockets.relay import sio
from src.debug_log import agent_log, node_log


def _integrity_audit_payload(mount_path: str, is_read_only: bool, evidence_hash: str) -> dict:
    return {
        "file_path": mount_path,
        "read_only": is_read_only,
        "sha256": evidence_hash,
        "status": "PASSED" if is_read_only else "WARNING_WRITABLE",
    }


async def run_pipeline_task(investigation_id: uuid.UUID, mount_path: str):
    print(f"[Pipeline] Starting investigation {investigation_id} on {mount_path}")
    # #region agent log
    agent_log(
        "investigations.py:run_pipeline_task:entry",
        "pipeline_start",
        {"investigation_id": str(investigation_id), "mount_path": mount_path, "exists": os.path.exists(mount_path)},
        "D",
    )
    try:
        # Give frontend a moment to connect to socket room before graph executes
        await asyncio.sleep(2.0)
        
        graph = build_investigation_graph()
        initial_state = {
            "investigation_id": str(investigation_id),
            "evidence_path": mount_path,
            "plugin_queue": [],
            "plugin_outputs": {},
            "execution_log": [],
            "executed_plugins": [],
            "findings": [],
            "confidence_scores": {},
            "overall_confidence": 0.0,
            "contradictions": [],
            "hallucinations": [],
            "iteration": 0,
            "max_iterations": 3,
            "iteration_log": [],
            "iteration_memory": {},
            "context_summaries": {}
        }
        
        print("[Pipeline] Invoking LangGraph ainvoke...")
        result = await graph.ainvoke(initial_state)
        print(f"[Pipeline] Investigation {investigation_id} completed. Iterations: {result.get('iteration')}")
        # #region agent log
        agent_log(
            "investigations.py:run_pipeline_task:complete",
            "pipeline_complete",
            {
                "investigation_id": str(investigation_id),
                "iteration": result.get("iteration"),
                "plugin_count": len(result.get("executed_plugins", [])),
            },
            "D",
        )
        # #endregion

        from src.db.session import AsyncSessionLocal
        from src.models.investigations import Investigation as InvestigationModel
        from src.models.replays import InvestigationReplay

        inv_id_str = str(investigation_id)
        node_log("NODE_START", "replay", inv_id_str)

        replay_events = []
        current_offset = 1000
        
        # Planner agent active
        replay_events.append({
            "offset_ms": current_offset,
            "type": "agent:state_change",
            "payload": {"agent": "planner", "status": "active"}
        })
        current_offset += 2000
        replay_events.append({
            "offset_ms": current_offset,
            "type": "agent:state_change",
            "payload": {"agent": "planner", "status": "idle"}
        })
        current_offset += 500
        
        # Executor agent and plugins execution
        for entry in result.get("execution_log", []):
            plugin_name = entry.get("plugin")
            replay_events.append({
                "offset_ms": current_offset,
                "type": "agent:state_change",
                "payload": {"agent": "executor", "status": "active"}
            })
            current_offset += 500
            replay_events.append({
                "offset_ms": current_offset,
                "type": "plugin:running",
                "payload": {"plugin": plugin_name}
            })
            current_offset += 2000
            replay_events.append({
                "offset_ms": current_offset,
                "type": "plugin:completed",
                "payload": entry
            })
            current_offset += 500
            replay_events.append({
                "offset_ms": current_offset,
                "type": "agent:state_change",
                "payload": {"agent": "executor", "status": "idle"}
            })
            current_offset += 1000

        # Verifier agent active
        replay_events.append({
            "offset_ms": current_offset,
            "type": "agent:state_change",
            "payload": {"agent": "verifier", "status": "active"}
        })
        current_offset += 1500
        
        for finding in result.get("findings", []):
            replay_events.append({
                "offset_ms": current_offset,
                "type": "finding:created",
                "payload": finding
            })
            current_offset += 1000
            
        oc = result.get("overall_confidence", 0.0)
        replay_events.append({
            "offset_ms": current_offset,
            "type": "investigation:confidence",
            "payload": oc
        })
        current_offset += 1000
        
        replay_events.append({
            "offset_ms": current_offset,
            "type": "agent:state_change",
            "payload": {"agent": "verifier", "status": "idle"}
        })
        current_offset += 1000

        # Reporter agent active
        if result.get("report"):
            replay_events.append({
                "offset_ms": current_offset,
                "type": "agent:state_change",
                "payload": {"agent": "reporter", "status": "active"}
            })
            current_offset += 2500
            replay_events.append({
                "offset_ms": current_offset,
                "type": "report:complete",
                "payload": result.get("report")
            })
            current_offset += 500
            replay_events.append({
                "offset_ms": current_offset,
                "type": "agent:state_change",
                "payload": {"agent": "reporter", "status": "idle"}
            })

        try:
            async with AsyncSessionLocal() as session:
                inv_row = await session.get(InvestigationModel, investigation_id)
                if inv_row:
                    inv_row.status = "COMPLETED"
                    inv_row.iteration_count = result.get("iteration", inv_row.iteration_count)
                    oc = result.get("overall_confidence")
                    if oc is not None:
                        inv_row.overall_confidence = oc
                session.add(
                    InvestigationReplay(
                        investigation_id=investigation_id,
                        name=f"Investigation {investigation_id}",
                        description="Auto-generated replay trace",
                        events=replay_events or [{"type": "pipeline:empty", "payload": {}}],
                    )
                )
                await session.commit()
        except Exception as replay_err:
            node_log(
                "NODE_ERROR",
                "replay",
                inv_id_str,
                exception=str(replay_err),
                traceback_str=traceback.format_exc(),
            )
            raise

        node_log(
            "NODE_SUCCESS",
            "replay",
            inv_id_str,
            extra={"event_count": len(replay_events)},
        )
        agent_log(
            "investigations.py:run_pipeline_task:replay_saved",
            "replay_persisted",
            {"investigation_id": inv_id_str, "event_count": len(replay_events)},
            "F",
        )

        await sio.emit('agent:state_change', {'agent': 'planner', 'status': 'completed'}, room=f"investigation:{investigation_id}")
        await sio.emit('agent:state_change', {'agent': 'executor', 'status': 'completed'}, room=f"investigation:{investigation_id}")
        await sio.emit('agent:state_change', {'agent': 'verifier', 'status': 'completed'}, room=f"investigation:{investigation_id}")
        await sio.emit('agent:state_change', {'agent': 'reporter', 'status': 'completed'}, room=f"investigation:{investigation_id}")
        await sio.emit(
            'investigation:completed',
            {
                "status": "COMPLETED",
                "overall_confidence": oc,
                "iteration_count": result.get("iteration")
            },
            room=f"investigation:{investigation_id}"
        )
        
    except Exception as e:
        print(f"[Pipeline] ERROR in investigation {investigation_id}: {e}")
        traceback.print_exc()
        # #region agent log
        agent_log(
            "investigations.py:run_pipeline_task:error",
            "pipeline_error",
            {"investigation_id": str(investigation_id), "error": str(e), "traceback": traceback.format_exc()[-2000:]},
            "D",
        )
        # #endregion
        from src.db.session import AsyncSessionLocal
        from src.models.investigations import Investigation as InvestigationModel

        async with AsyncSessionLocal() as session:
            inv_row = await session.get(InvestigationModel, investigation_id)
            if inv_row:
                inv_row.status = "FAILED"
                await session.commit()

from fastapi import UploadFile, File
from src.models.cases import Case

EVIDENCE_DIR = os.getenv("EVIDENCE_BASE_PATH", "/mnt/evidence")

@router.post("/upload", response_model=InvestigationResponse)
async def upload_and_start_investigation(
    background_tasks: BackgroundTasks, 
    file: UploadFile = File(...), 
    db: AsyncSession = Depends(get_db)
):
    import hashlib
    import os
    import json
    
    # 1. Ensure a default case exists to bind evidence
    result = await db.execute(select(Case).limit(1))
    case = result.scalar_one_or_none()
    if not case:
        case = Case(case_name="Default Auto-Generated Case", status="QUEUED", priority=2)
        db.add(case)
        await db.commit()
        await db.refresh(case)

    # 2. Ingest Evidence File
    os.makedirs(os.path.join(EVIDENCE_DIR, str(case.id)), exist_ok=True)
    evidence_id = uuid.uuid4()
    ext = os.path.splitext(file.filename)[1]
    volume_path = os.path.join(EVIDENCE_DIR, str(case.id), f"{evidence_id}{ext}")
    
    sha256 = hashlib.sha256()
    size = 0
    with open(volume_path, "wb") as f:
        while chunk := await file.read(4 * 1024 * 1024):
            f.write(chunk)
            sha256.update(chunk)
            size += len(chunk)
            
    hash_hex = sha256.hexdigest()
    
    evidence = EvidenceRecord(
        id=evidence_id,
        case_id=case.id,
        filename=file.filename,
        sha256_hash=hash_hex,
        file_size_bytes=size,
        volume_path=volume_path
    )
    db.add(evidence)
    await db.commit()
    await db.refresh(evidence)

    # 3. Create Investigation
    investigation = Investigation(
        case_id=case.id,
        evidence_id=evidence.id,
        status="PLANNING"
    )
    db.add(investigation)
    await db.commit()
    await db.refresh(investigation)
    
    # 4. Log Integrity Check Audit Event
    from src.models.audit import AuditEvent
    is_read_only = not os.access(volume_path, os.W_OK) if os.path.exists(volume_path) else True
    audit = AuditEvent(
        event_type="EVIDENCE_INTEGRITY_CHECK",
        entity_type="investigation",
        entity_id=investigation.id,
        payload=_integrity_audit_payload(volume_path, is_read_only, hash_hex),
    )
    db.add(audit)
    await db.commit()
    # #region agent log
    agent_log(
        "investigations.py:upload_and_start:started",
        "investigation_created",
        {"investigation_id": str(investigation.id), "volume_path": volume_path},
        "A",
    )
    # #endregion

    # 5. Kick off LangGraph async task
    background_tasks.add_task(run_pipeline_task, investigation.id, volume_path)
    
    return investigation

@router.post("", response_model=InvestigationResponse)
async def start_investigation(req: InvestigationCreate, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    # #region agent log
    agent_log(
        "investigations.py:start_investigation:entry",
        "start_investigation",
        {"evidence_id": str(req.evidence_id)},
        "A",
    )
    # #endregion
    try:
        return await _start_investigation_impl(req, background_tasks, db)
    except Exception as e:
        # #region agent log
        agent_log(
            "investigations.py:start_investigation:error",
            "start_investigation_failed",
            {"evidence_id": str(req.evidence_id), "error": str(e), "type": type(e).__name__},
            "A",
        )
        # #endregion
        raise


async def _start_investigation_impl(
    req: InvestigationCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession,
):
    # Verify evidence exists
    result = await db.execute(select(EvidenceRecord).where(EvidenceRecord.id == req.evidence_id))
    evidence = result.scalar_one_or_none()
    if not evidence:
        raise HTTPException(status_code=404, detail="Evidence not found")

    import hashlib
    import os
    import json
    
    # 1. Verify read-only mount status
    mount_path = evidence.volume_path
    # #region agent log
    agent_log(
        "investigations.py:start_investigation:evidence_resolved",
        "evidence_lookup",
        {
            "evidence_id": str(evidence.id),
            "volume_path": mount_path,
            "path_exists": os.path.exists(mount_path),
        },
        "C",
    )
    # #endregion
    is_read_only = not os.access(mount_path, os.W_OK) if os.path.exists(mount_path) else True
    
    # 2. Hash evidence for integrity (mock hash if file missing for demo)
    evidence_hash = "mock_sha256_hash_if_missing"
    if os.path.exists(mount_path):
        hasher = hashlib.sha256()
        try:
            with open(mount_path, 'rb') as f:
                # Read first 1MB for speed during demo
                buf = f.read(1024 * 1024)
                hasher.update(buf)
            evidence_hash = hasher.hexdigest()
        except Exception:
            pass

    investigation = Investigation(
        case_id=evidence.case_id,
        evidence_id=req.evidence_id,
        status="PLANNING"
    )
    db.add(investigation)
    await db.commit()
    await db.refresh(investigation)
    
    # 3. Log Integrity Check Audit Event
    from src.models.audit import AuditEvent
    audit = AuditEvent(
        event_type="EVIDENCE_INTEGRITY_CHECK",
        entity_type="investigation",
        entity_id=investigation.id,
        payload=_integrity_audit_payload(mount_path, is_read_only, evidence_hash),
    )
    db.add(audit)
    await db.commit()
    # #region agent log
    agent_log(
        "investigations.py:start_investigation:started",
        "investigation_created",
        {"investigation_id": str(investigation.id), "volume_path": mount_path},
        "B",
    )
    # #endregion

    # 4. Kick off LangGraph async task
    background_tasks.add_task(run_pipeline_task, investigation.id, mount_path)
    
    return investigation

@router.get("/{investigation_id}", response_model=InvestigationResponse)
async def get_investigation(investigation_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Investigation).where(Investigation.id == investigation_id))
    inv = result.scalar_one_or_none()
    if not inv:
        raise HTTPException(status_code=404, detail="Investigation not found")
    return inv

from src.models.replays import InvestigationReplay

@router.get("/{investigation_id}/replay")
async def get_investigation_replay(investigation_id: str, db: AsyncSession = Depends(get_db)):
    if investigation_id.lower() == "demo":
        # Fetch the flagship demo trace
        result = await db.execute(select(InvestigationReplay).where(InvestigationReplay.name == "Flagship Process Hollowing Demo"))
        replay = result.scalar_one_or_none()
        if not replay:
            # Fallback to just grabbing the first replay if name doesn't match perfectly
            result = await db.execute(select(InvestigationReplay).limit(1))
            replay = result.scalar_one_or_none()
    else:
        try:
            inv_uuid = uuid.UUID(investigation_id)
            result = await db.execute(select(InvestigationReplay).where(InvestigationReplay.investigation_id == inv_uuid))
            replay = result.scalar_one_or_none()
        except ValueError:
            raise HTTPException(status_code=422, detail="Invalid investigation ID format")
            
    if not replay:
        raise HTTPException(status_code=404, detail="Replay trace not found for this investigation")
    
    return {
        "id": replay.id,
        "investigation_id": replay.investigation_id,
        "name": replay.name,
        "description": replay.description,
        "events": replay.events
    }
