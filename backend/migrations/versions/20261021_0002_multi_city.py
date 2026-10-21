"""Add city metadata and city-aware observation tables.

Revision ID: 20261021_0002
Revises: 20261021_0001
"""
from alembic import op


revision = "20261021_0002"
down_revision = "20261021_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS cities (
            code VARCHAR(32) PRIMARY KEY,
            name_vi VARCHAR(100) NOT NULL,
            name_en VARCHAR(100) NOT NULL,
            region VARCHAR(10) NOT NULL CHECK (region IN ('Bac', 'Trung', 'Nam')),
            latitude DOUBLE PRECISION NOT NULL,
            longitude DOUBLE PRECISION NOT NULL,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        """
    )
    op.execute(
        """
        INSERT INTO cities (code, name_vi, name_en, region, latitude, longitude)
        VALUES
            ('hanoi', 'Hà Nội', 'Hanoi', 'Bac', 21.0285, 105.8542),
            ('haiphong', 'Hải Phòng', 'Hai Phong', 'Bac', 20.8449, 106.6881),
            ('danang', 'Đà Nẵng', 'Da Nang', 'Trung', 16.0544, 108.2022),
            ('hochiminh', 'TP. Hồ Chí Minh', 'Ho Chi Minh City', 'Nam', 10.8231, 106.6297),
            ('cantho', 'Cần Thơ', 'Can Tho', 'Nam', 10.0452, 105.7469)
        ON CONFLICT (code) DO NOTHING
        """
    )

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS air_quality_observations (
            id BIGSERIAL PRIMARY KEY,
            city_code VARCHAR(32) NOT NULL REFERENCES cities(code) ON UPDATE CASCADE ON DELETE RESTRICT,
            time TIMESTAMP NOT NULL,
            pm10 DOUBLE PRECISION,
            pm2_5 DOUBLE PRECISION,
            co DOUBLE PRECISION,
            o3 DOUBLE PRECISION,
            no2 DOUBLE PRECISION,
            so2 DOUBLE PRECISION,
            co2 DOUBLE PRECISION,
            CONSTRAINT uq_air_quality_city_time UNIQUE (city_code, time)
        )
        """
    )
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS weather_observations (
            id BIGSERIAL PRIMARY KEY,
            city_code VARCHAR(32) NOT NULL REFERENCES cities(code) ON UPDATE CASCADE ON DELETE RESTRICT,
            time TIMESTAMP NOT NULL,
            temperature_2m DOUBLE PRECISION,
            dew_point_2m DOUBLE PRECISION,
            relative_humidity_2m DOUBLE PRECISION,
            rain DOUBLE PRECISION,
            precipitation DOUBLE PRECISION,
            surface_pressure DOUBLE PRECISION,
            wind_speed_10m DOUBLE PRECISION,
            CONSTRAINT uq_weather_city_time UNIQUE (city_code, time)
        )
        """
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_air_quality_time ON air_quality_observations(time)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_weather_time ON weather_observations(time)"
    )

    # Copy the existing single-city measurements. Keep the legacy source tables
    # intact because current Hanoi forecast code still reads them.
    op.execute(
        """
        DO $migration$
        BEGIN
            IF to_regclass('public.hanoi_pollutants') IS NOT NULL THEN
                INSERT INTO air_quality_observations
                    (city_code, time, pm10, pm2_5, co, o3, no2, so2, co2)
                SELECT 'hanoi', time, pm10, pm2_5, co, o3, no2, so2, co2
                FROM public.hanoi_pollutants
                ON CONFLICT (city_code, time) DO NOTHING;
            END IF;

            IF to_regclass('public.hanoi_weather') IS NOT NULL THEN
                INSERT INTO weather_observations
                    (city_code, time, temperature_2m, dew_point_2m,
                     relative_humidity_2m, rain, precipitation,
                     surface_pressure, wind_speed_10m)
                SELECT 'hanoi', time, temperature_2m, dew_point_2m,
                       relative_humidity_2m, rain, precipitation,
                       surface_pressure, wind_speed_10m
                FROM public.hanoi_weather
                ON CONFLICT (city_code, time) DO NOTHING;
            END IF;
        END;
        $migration$
        """
    )


def downgrade() -> None:
    # This removes the new city-aware copies. Back up first if they contain
    # measurements that were added for cities other than Hanoi.
    op.execute("DROP TABLE IF EXISTS weather_observations")
    op.execute("DROP TABLE IF EXISTS air_quality_observations")
    op.execute("DROP TABLE IF EXISTS cities")
