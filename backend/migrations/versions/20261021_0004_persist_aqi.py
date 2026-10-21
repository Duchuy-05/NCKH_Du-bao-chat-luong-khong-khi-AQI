"""Persist processed hourly and daily VN_AQI observations.

Revision ID: 20261021_0004
Revises: 20261021_0003
"""
from alembic import op


revision = "20261021_0004"
down_revision = "20261021_0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE air_quality_observations
            ADD COLUMN IF NOT EXISTS aqi SMALLINT,
            ADD COLUMN IF NOT EXISTS dominant_pollutant VARCHAR(10),
            ADD COLUMN IF NOT EXISTS level VARCHAR(20)
        """
    )
    op.execute(
        """
        ALTER TABLE weather_observations
            ADD COLUMN IF NOT EXISTS wind_direction_10m DOUBLE PRECISION,
            ADD COLUMN IF NOT EXISTS missing_flag BOOLEAN NOT NULL DEFAULT FALSE
        """
    )
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS aqi_daily_observations (
            id BIGSERIAL PRIMARY KEY,
            city_code VARCHAR(32) NOT NULL REFERENCES cities(code)
                ON UPDATE CASCADE ON DELETE RESTRICT,
            time TIMESTAMP NOT NULL,
            pm10 DOUBLE PRECISION,
            pm2_5 DOUBLE PRECISION,
            co DOUBLE PRECISION,
            o3 DOUBLE PRECISION,
            no2 DOUBLE PRECISION,
            so2 DOUBLE PRECISION,
            aqi SMALLINT,
            dominant_pollutant VARCHAR(10),
            level VARCHAR(20),
            temperature DOUBLE PRECISION,
            humidity DOUBLE PRECISION,
            wind_speed DOUBLE PRECISION,
            wind_direction DOUBLE PRECISION,
            pressure DOUBLE PRECISION,
            precipitation DOUBLE PRECISION,
            missing_flag BOOLEAN NOT NULL DEFAULT FALSE,
            CONSTRAINT uq_aqi_daily_city_time UNIQUE (city_code, time)
        )
        """
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_aqi_daily_time ON aqi_daily_observations(time)"
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS aqi_daily_observations")
    op.execute(
        "ALTER TABLE weather_observations DROP COLUMN IF EXISTS wind_direction_10m, "
        "DROP COLUMN IF EXISTS missing_flag"
    )
    op.execute(
        "ALTER TABLE air_quality_observations DROP COLUMN IF EXISTS aqi, "
        "DROP COLUMN IF EXISTS dominant_pollutant, DROP COLUMN IF EXISTS level"
    )
