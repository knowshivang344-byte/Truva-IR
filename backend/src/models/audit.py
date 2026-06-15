import uuid
from datetime import datetime

from sqlalchemy import String, DateTime, ForeignKey, Uuid, JSON
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func
from sqlalchemy.types import TypeDecorator
from sqlalchemy.dialects.postgresql import INET

from .base import Base

class DialectAgnosticINET(TypeDecorator):
    impl = String(45)
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(INET())
        else:
            return dialect.type_descriptor(String(45))

class AuditEvent(Base):
    __tablename__ = "audit_events"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    event_type: Mapped[str] = mapped_column(String(100), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(50), nullable=True)
    entity_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=True)
    actor_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id"), nullable=True)
    payload: Mapped[dict] = mapped_column(JSON, nullable=True)
    ip_address: Mapped[str] = mapped_column(DialectAgnosticINET, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
