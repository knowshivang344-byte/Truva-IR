import uuid
from datetime import datetime

from sqlalchemy import Float, Integer, ForeignKey, DateTime, Uuid, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from .base import Base

class BenchmarkRun(Base):
    __tablename__ = "benchmark_runs"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    investigation_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("investigations.id"), nullable=False)
    
    true_positives: Mapped[int] = mapped_column(Integer, default=0)
    false_positives: Mapped[int] = mapped_column(Integer, default=0)
    false_negatives: Mapped[int] = mapped_column(Integer, default=0)
    hallucinations_caught: Mapped[int] = mapped_column(Integer, default=0)
    
    confidence_accuracy: Mapped[float] = mapped_column(Float, default=0.0)
    
    ground_truth_reference: Mapped[dict] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    investigation = relationship("Investigation")
