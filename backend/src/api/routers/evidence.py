import uuid
import os
import hashlib
from typing import List

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from src.models.evidence import EvidenceRecord
from src.models.cases import Case
from src.db.session import get_db
from pydantic import BaseModel, ConfigDict
from datetime import datetime

router = APIRouter(prefix="/evidence", tags=["evidence"])

class EvidenceResponse(BaseModel):
    id: uuid.UUID
    case_id: uuid.UUID
    filename: str
    sha256_hash: str
    file_size_bytes: int
    ingested_at: datetime
    model_config = ConfigDict(from_attributes=True)

EVIDENCE_DIR = os.getenv("EVIDENCE_BASE_PATH", "/mnt/evidence")

@router.post("/{case_id}", response_model=EvidenceResponse)
async def upload_evidence(case_id: uuid.UUID, file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    # Verify case exists
    result = await db.execute(select(Case).where(Case.id == case_id))
    case = result.scalar_one_or_none()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    # In MVP, we stream the file to compute hash and save
    os.makedirs(os.path.join(EVIDENCE_DIR, str(case_id)), exist_ok=True)
    evidence_id = uuid.uuid4()
    ext = os.path.splitext(file.filename)[1]
    volume_path = os.path.join(EVIDENCE_DIR, str(case_id), f"{evidence_id}{ext}")
    
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
        case_id=case_id,
        filename=file.filename,
        sha256_hash=hash_hex,
        file_size_bytes=size,
        volume_path=volume_path
    )
    db.add(evidence)
    await db.commit()
    await db.refresh(evidence)
    return evidence

@router.get("/case/{case_id}", response_model=List[EvidenceResponse])
async def list_case_evidence(case_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(EvidenceRecord).where(EvidenceRecord.case_id == case_id))
    return result.scalars().all()
