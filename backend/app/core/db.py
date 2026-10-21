"""Shared PostgreSQL engine helpers."""
from __future__ import annotations

from sqlalchemy import create_engine

from app.core.config import DATABASE_URL


def get_engine():
    """Create a SQLAlchemy engine for the configured PostgreSQL database."""
    return create_engine(DATABASE_URL, pool_pre_ping=True)
