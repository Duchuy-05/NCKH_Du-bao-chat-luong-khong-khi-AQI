"""Remove the retired single-city Hanoi observation tables.

Revision ID: 20261021_0005
Revises: 20261021_0004
"""
from alembic import op


revision = "20261021_0005"
down_revision = "20261021_0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Preserve any rows added to the legacy tables after migration 0002. Rows
    # already present in the city-aware tables take precedence on conflicts.
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
    op.execute("DROP TABLE IF EXISTS public.hanoi_weather")
    op.execute("DROP TABLE IF EXISTS public.hanoi_pollutants")


def downgrade() -> None:
    # Recreate the old schema empty. The observations remain in the new
    # city-aware tables and are not copied back by a downgrade.
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS public.hanoi_pollutants (
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
        CREATE TABLE IF NOT EXISTS public.hanoi_weather (
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
        "CREATE INDEX IF NOT EXISTS idx_hanoi_pollutants_time "
        "ON public.hanoi_pollutants(time)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_hanoi_weather_time "
        "ON public.hanoi_weather(time)"
    )
