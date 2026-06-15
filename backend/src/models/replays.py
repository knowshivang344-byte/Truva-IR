import uuid
from datetime import datetime

from sqlalchemy import String, DateTime, ForeignKey, Uuid, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from .base import Base

class InvestigationReplay(Base):
    __tablename__ = "investigation_replays"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    investigation_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("investigations.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(String(1000), nullable=True)
    events: Mapped[list] = mapped_column(JSON, nullable=False)  # Array of websocket-style events
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    investigation = relationship("Investigation")
