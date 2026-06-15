import uuid
from datetime import datetime

from sqlalchemy import String, SmallInteger, Numeric, DateTime, ForeignKey, Uuid, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from .base import Base

class Investigation(Base):
    __tablename__ = "investigations"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    case_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("cases.id"), nullable=False)
    evidence_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("evidence_records.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="PLANNING", nullable=False)
    iteration_count: Mapped[int] = mapped_column(SmallInteger, default=0, nullable=False)
    max_iterations: Mapped[int] = mapped_column(SmallInteger, default=3, nullable=False)
    overall_confidence: Mapped[float] = mapped_column(Numeric(5, 4), nullable=True)
    best_iteration: Mapped[int] = mapped_column(SmallInteger, nullable=True)
    loop_state: Mapped[str] = mapped_column(String(50), nullable=True)
    iteration_history: Mapped[dict] = mapped_column(JSON, nullable=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    completed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    langgraph_thread_id: Mapped[str] = mapped_column(String(255), nullable=True)

    case = relationship("Case", back_populates="investigations")
    evidence = relationship("EvidenceRecord", back_populates="investigations")
    findings = relationship("Finding", back_populates="investigation")
