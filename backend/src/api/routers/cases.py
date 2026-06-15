import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from src.models.cases import Case
from src.db.session import get_db
from pydantic import BaseModel, ConfigDict
from datetime import datetime

router = APIRouter(prefix="/cases", tags=["cases"])

class CaseCreate(BaseModel):
    case_name: str
    priority: int = 2
    tags: List[str] = []

class CaseResponse(BaseModel):
    id: uuid.UUID
    case_name: str
    status: str
    priority: int
    tags: List[str] | None
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

@router.post("", response_model=CaseResponse)
async def create_case(case: CaseCreate, db: AsyncSession = Depends(get_db)):
    new_case = Case(
        case_name=case.case_name,
        priority=case.priority,
        tags=case.tags,
        status="QUEUED"
    )
    db.add(new_case)
    await db.commit()
    await db.refresh(new_case)
    return new_case

@router.get("", response_model=List[CaseResponse])
async def list_cases(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Case).order_by(Case.created_at.desc()))
    return result.scalars().all()

@router.get("/{case_id}", response_model=CaseResponse)
async def get_case(case_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Case).where(Case.id == case_id))
    case = result.scalar_one_or_none()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return case
