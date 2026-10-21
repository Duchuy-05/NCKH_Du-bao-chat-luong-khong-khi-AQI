"""Create model training history table.

Revision ID: 20261021_0006
Revises: 20261021_0005
"""
from alembic import op


revision = "20261021_0006"
down_revision = "20261021_0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE model_training_runs (
            id BIGSERIAL PRIMARY KEY,
            run_code UUID NOT NULL UNIQUE,
            city_code VARCHAR(32) NOT NULL
                REFERENCES cities(code) ON UPDATE CASCADE ON DELETE RESTRICT,
            model_type VARCHAR(16) NOT NULL
                CHECK (model_type IN ('daily', 'hourly')),
            module_name VARCHAR(160) NOT NULL,
            trained_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            finished_at TIMESTAMPTZ,
            last_data_date DATE,
            mae JSONB,
            rmse JSONB,
            best_params JSONB,
            status VARCHAR(16) NOT NULL DEFAULT 'running'
                CHECK (status IN ('running', 'completed', 'failed')),
            file_name VARCHAR(255),
            error_message TEXT
        )
        """
    )
    op.execute(
        """
        CREATE INDEX idx_model_training_runs_city_type_trained_at
        ON model_training_runs (city_code, model_type, trained_at DESC)
        """
    )
    op.execute(
        """
        CREATE INDEX idx_model_training_runs_status_trained_at
        ON model_training_runs (status, trained_at DESC)
        """
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS model_training_runs")
