import uuid
from datetime import datetime
from typing import List

from sqlalchemy import String, SmallInteger, Numeric, DateTime, ForeignKey, Boolean, Uuid, JSON, TEXT
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from .base import Base

class Finding(Base):
    __tablename__ = "findings"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    investigation_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("investigations.id"), nullable=False)
    iteration: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str] = mapped_column(TEXT, nullable=False)
    severity: Mapped[str] = mapped_column(String(20), nullable=False)
    confidence_score: Mapped[float] = mapped_column(Numeric(5, 4), nullable=False)
    confidence_label: Mapped[str] = mapped_column(String(20), nullable=False)
    mitre_techniques: Mapped[List[str]] = mapped_column(JSON, nullable=True)
    is_hallucination: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    hallucination_rules: Mapped[List[str]] = mapped_column(JSON, nullable=True)
    evidence_trace: Mapped[dict] = mapped_column(JSON, nullable=True)
    reasoning_chain: Mapped[dict] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    investigation = relationship("Investigation", back_populates="findings")
