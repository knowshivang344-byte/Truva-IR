import uuid
from datetime import datetime
from typing import List

from sqlalchemy import String, SmallInteger, DateTime, ForeignKey, Uuid, JSON, TEXT
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from .base import Base

class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    username: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    role: Mapped[str] = mapped_column(String(50), default="analyst")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

class Case(Base):
    __tablename__ = "cases"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    case_name: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="QUEUED", nullable=False)
    priority: Mapped[int] = mapped_column(SmallInteger, default=2, nullable=False)
    analyst_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id"), nullable=True)
    tags: Mapped[List[str]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    investigations = relationship("Investigation", back_populates="case")
    evidence = relationship("EvidenceRecord", back_populates="case")
