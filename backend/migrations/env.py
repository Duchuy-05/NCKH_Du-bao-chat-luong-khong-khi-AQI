from __future__ import annotations

import os
import sys
from logging.config import fileConfig
from pathlib import Path

from alembic import context
from dotenv import load_dotenv
from sqlalchemy import create_engine, pool
from sqlalchemy.engine import URL


config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

backend_dir = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(backend_dir))
load_dotenv(backend_dir / ".env")

database_url = os.getenv("DATABASE_URL")
if not database_url:
    db_host = os.getenv("DB_HOST")
    db_name = os.getenv("DB_NAME")
    db_user = os.getenv("DB_USER")
    if not all((db_host, db_name, db_user)):
        raise RuntimeError(
            "Set DATABASE_URL or DB_HOST, DB_NAME, and DB_USER in backend/.env before running migrations."
        )
    db_port = os.getenv("DB_PORT")
    database_url = URL.create(
        "postgresql+psycopg",
        username=db_user,
        password=os.getenv("DB_PASSWORD") or None,
        host=db_host,
        port=int(db_port) if db_port else None,
        database=db_name,
    ).render_as_string(hide_password=False)


def run_migrations_offline() -> None:
    context.configure(
        url=database_url,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = create_engine(database_url, poolclass=pool.NullPool)
    try:
        with connectable.connect() as connection:
            context.configure(connection=connection, compare_type=True)
            with context.begin_transaction():
                context.run_migrations()
    finally:
        connectable.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
