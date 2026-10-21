"""Create the existing AQI and health-advice schema when absent.

Revision ID: 20261021_0001
Revises:
"""
from alembic import op


revision = "20261021_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS hanoi_pollutants (
            id BIGSERIAL PRIMARY KEY,
            time TIMESTAMP NOT NULL UNIQUE,
            pm10 DOUBLE PRECISION,
            pm2_5 DOUBLE PRECISION,
            co DOUBLE PRECISION,
            o3 DOUBLE PRECISION,
            no2 DOUBLE PRECISION,
            so2 DOUBLE PRECISION,
            co2 DOUBLE PRECISION
        )
        """
    )
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS hanoi_weather (
            id BIGSERIAL PRIMARY KEY,
            time TIMESTAMP NOT NULL UNIQUE,
            temperature_2m DOUBLE PRECISION,
            dew_point_2m DOUBLE PRECISION,
            relative_humidity_2m DOUBLE PRECISION,
            rain DOUBLE PRECISION,
            precipitation DOUBLE PRECISION,
            surface_pressure DOUBLE PRECISION,
            wind_speed_10m DOUBLE PRECISION
        )
        """
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_hanoi_pollutants_time ON hanoi_pollutants(time)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_hanoi_weather_time ON hanoi_weather(time)"
    )

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS advice_sources (
            id SERIAL PRIMARY KEY,
            code VARCHAR(10) NOT NULL UNIQUE,
            title TEXT NOT NULL,
            publisher VARCHAR(255),
            published_year SMALLINT,
            url TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        """
    )
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS advice_topics (
            id SERIAL PRIMARY KEY,
            topic_type VARCHAR(30) NOT NULL DEFAULT 'target_group',
            slug VARCHAR(60) NOT NULL UNIQUE,
            title_vi VARCHAR(200) NOT NULL,
            title_en VARCHAR(200),
            icon_key VARCHAR(30) NOT NULL DEFAULT 'HeartPulse',
            risk_level VARCHAR(20) NOT NULL DEFAULT 'moderate',
            display_order SMALLINT NOT NULL DEFAULT 0,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        """
    )
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS advice_items (
            id SERIAL PRIMARY KEY,
            topic_id INT NOT NULL REFERENCES advice_topics(id) ON DELETE CASCADE,
            content_vi TEXT NOT NULL,
            content_en TEXT,
            sort_order SMALLINT NOT NULL DEFAULT 0,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_advice_items_topic_active_sort
        ON advice_items(topic_id, is_active, sort_order, id)
        """
    )
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS advice_topic_sources (
            topic_id INT NOT NULL REFERENCES advice_topics(id) ON DELETE CASCADE,
            source_id INT NOT NULL REFERENCES advice_sources(id) ON DELETE CASCADE,
            PRIMARY KEY (topic_id, source_id)
        )
        """
    )
    op.execute(
        """
        CREATE OR REPLACE FUNCTION set_updated_at()
        RETURNS TRIGGER LANGUAGE plpgsql AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$
        """
    )
    op.execute(
        """
        DO $migration$
        DECLARE target_table TEXT;
        BEGIN
            FOREACH target_table IN ARRAY ARRAY['advice_sources', 'advice_topics', 'advice_items']
            LOOP
                EXECUTE format('DROP TRIGGER IF EXISTS trg_updated_at ON %I', target_table);
                EXECUTE format(
                    'CREATE TRIGGER trg_updated_at BEFORE UPDATE ON %I '
                    'FOR EACH ROW EXECUTE FUNCTION set_updated_at()',
                    target_table
                );
            END LOOP;
        END;
        $migration$
        """
    )


def downgrade() -> None:
    # This baseline also runs against databases that already own these tables.
    # Their origin cannot be distinguished, so dropping them could destroy data.
    pass
