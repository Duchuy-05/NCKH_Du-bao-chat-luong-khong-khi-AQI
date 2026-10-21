"""Read and rotate the health advice content stored in PostgreSQL."""
from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from functools import lru_cache

from sqlalchemy import text
from sqlalchemy.engine import Engine

from app.core.db import get_engine


ROTATION_HOURS = 6
ITEMS_PER_TOPIC = 4
VIETNAM_TIMEZONE = timezone(timedelta(hours=7), name="Asia/Ho_Chi_Minh")
_EPOCH_DATE = date(1970, 1, 1)


@lru_cache(maxsize=1)
def _engine() -> Engine:
    """Reuse one SQLAlchemy pool for health-advice requests."""
    return get_engine()


def _rotation_window(now: datetime | None = None) -> tuple[int, datetime, datetime]:
    """Return a stable slot and the current/next six-hour Vietnam boundaries."""
    now_utc = now or datetime.now(timezone.utc)
    if now_utc.tzinfo is None:
        now_utc = now_utc.replace(tzinfo=timezone.utc)
    now_utc = now_utc.astimezone(timezone.utc)

    local_now = now_utc.astimezone(VIETNAM_TIMEZONE)
    day_number = (local_now.date() - _EPOCH_DATE).days
    slot = day_number * (24 // ROTATION_HOURS) + local_now.hour // ROTATION_HOURS

    next_hour = (local_now.hour // ROTATION_HOURS + 1) * ROTATION_HOURS
    if next_hour >= 24:
        next_local = (local_now + timedelta(days=1)).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
    else:
        next_local = local_now.replace(
            hour=next_hour, minute=0, second=0, microsecond=0
        )

    return slot, now_utc, next_local.astimezone(timezone.utc)


def _rotating_items(items: list[dict], slot: int) -> list[dict]:
    """Select four items from a topic's cyclic groups for this six-hour slot."""
    if len(items) <= ITEMS_PER_TOPIC:
        return items

    group_count = (len(items) + ITEMS_PER_TOPIC - 1) // ITEMS_PER_TOPIC
    start = (slot % group_count) * ITEMS_PER_TOPIC
    return [items[(start + offset) % len(items)] for offset in range(ITEMS_PER_TOPIC)]


def get_health_advice() -> dict:
    """Return active topics, their current advice items, and linked sources."""
    slot, generated_at, rotates_at = _rotation_window()

    topics_by_id: dict[int, dict] = {}
    items_by_topic: dict[int, list[dict]] = {}
    sources_by_topic: dict[int, list[dict]] = {}

    with _engine().connect() as connection:
        topic_rows = connection.execute(
            text(
                """
                SELECT id, slug, title_vi, title_en, icon_key, risk_level, display_order
                FROM advice_topics
                WHERE is_active IS TRUE AND topic_type = :topic_type
                ORDER BY display_order, id
                """
            ),
            {"topic_type": "target_group"},
        ).mappings()

        for row in topic_rows:
            topic_id = int(row["id"])
            topics_by_id[topic_id] = {
                "id": topic_id,
                "slug": row["slug"],
                "titleVi": row["title_vi"],
                "titleEn": row["title_en"],
                "iconKey": row["icon_key"],
                "riskLevel": row["risk_level"],
                "displayOrder": int(row["display_order"]),
                "items": [],
                "sources": [],
            }
            items_by_topic[topic_id] = []
            sources_by_topic[topic_id] = []

        if topics_by_id:
            item_rows = connection.execute(
                text(
                    """
                    SELECT i.id, i.topic_id, i.content_vi, i.content_en
                    FROM advice_items AS i
                    JOIN advice_topics AS t ON t.id = i.topic_id
                    WHERE i.is_active IS TRUE
                      AND t.is_active IS TRUE
                      AND t.topic_type = :topic_type
                    ORDER BY t.display_order, i.sort_order, i.id
                    """
                ),
                {"topic_type": "target_group"},
            ).mappings()

            for row in item_rows:
                topic_id = int(row["topic_id"])
                if topic_id in items_by_topic:
                    items_by_topic[topic_id].append(
                        {
                            "id": int(row["id"]),
                            "contentVi": row["content_vi"],
                            "contentEn": row["content_en"],
                        }
                    )

            source_rows = connection.execute(
                text(
                    """
                    SELECT ats.topic_id, s.code, s.title, s.publisher,
                           s.published_year, s.url
                    FROM advice_topic_sources AS ats
                    JOIN advice_sources AS s ON s.id = ats.source_id
                    JOIN advice_topics AS t ON t.id = ats.topic_id
                    WHERE t.is_active IS TRUE AND t.topic_type = :topic_type
                    ORDER BY t.display_order, s.code, s.id
                    """
                ),
                {"topic_type": "target_group"},
            ).mappings()

            for row in source_rows:
                topic_id = int(row["topic_id"])
                if topic_id in sources_by_topic:
                    sources_by_topic[topic_id].append(
                        {
                            "code": row["code"],
                            "title": row["title"],
                            "publisher": row["publisher"],
                            "publishedYear": row["published_year"],
                            "url": row["url"],
                        }
                    )

    topics = []
    for topic_id, topic in topics_by_id.items():
        topic["items"] = _rotating_items(items_by_topic[topic_id], slot)
        topic["sources"] = sources_by_topic[topic_id]
        topics.append(topic)

    return {
        "slot": slot,
        "generatedAt": generated_at.isoformat(),
        "rotatesAt": rotates_at.isoformat(),
        "topics": topics,
    }
