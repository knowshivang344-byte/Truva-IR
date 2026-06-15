import uuid
from datetime import datetime

from sqlalchemy import String, BigInteger, DateTime, ForeignKey, CheckConstraint, Uuid, JSON, TEXT, CHAR
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from .base import Base

class EvidenceRecord(Base):
    __tablename__ = "evidence_records"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    case_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("cases.id"), nullable=False)
    filename: Mapped[str] = mapped_column(String(512), nullable=False)
    sha256_hash: Mapped[str] = mapped_column(CHAR(64), nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False)
    volume_path: Mapped[str] = mapped_column(TEXT, nullable=False)
    os_profile: Mapped[dict] = mapped_column(JSON, nullable=True)
    ingested_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    integrity_verified_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)

    case = relationship("Case", back_populates="evidence")
    investigations = relationship("Investigation", back_populates="evidence")

    __table_args__ = (
        CheckConstraint('length(sha256_hash) = 64', name='evidence_hash_immutable'),
    )
