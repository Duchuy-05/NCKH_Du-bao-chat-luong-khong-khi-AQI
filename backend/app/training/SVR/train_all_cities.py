"""Train every supported city's daily and hourly SVR model.

Run from the backend directory:
    python -m app.training.SVR.train_all_cities

Optional examples:
    python -m app.training.SVR.train_all_cities --city hanoi --city danang
    python -m app.training.SVR.train_all_cities --target daily
"""
from __future__ import annotations

import argparse
import sys
from typing import Callable, Any

from app.core.config import SUPPORTED_CITIES
from app.training.SVR.train_svr_daily import train as train_daily
from app.training.SVR.train_svr_hourly import train as train_hourly

TRAINERS: dict[str, Callable[[str], Any]] = {
    "daily": train_daily,
    "hourly": train_hourly,
}


def train_models(cities: list[str], targets: list[str]) -> list[dict[str, str]]:
    """Run the requested training jobs sequentially and collect their outcomes."""
    results: list[dict[str, str]] = []
    total = len(cities) * len(targets)
    job_number = 0

    for city in cities:
        for target in targets:
            job_number += 1
            print(
                f"\n[{job_number}/{total}] Bắt đầu huấn luyện {target} cho {city}...",
                flush=True,
            )
            try:
                result = TRAINERS[target](city)
            except Exception as exc:
                message = f"{type(exc).__name__}: {exc}"
                results.append({
                    "city": city,
                    "target": target,
                    "status": "failed",
                    "detail": message,
                })
                print(f"[THẤT BẠI] {city} / {target}: {message}", flush=True)
                continue

            model_path = str(result.get("model_path", ""))
            results.append({
                "city": city,
                "target": target,
                "status": "success",
                "detail": model_path,
            })
            print(f"[THÀNH CÔNG] {city} / {target}: {model_path}", flush=True)

    return results


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Huấn luyện các mô hình SVR daily/hourly cho các thành phố.",
    )
    parser.add_argument(
        "--city",
        choices=SUPPORTED_CITIES,
        action="append",
        help="Thành phố cần huấn luyện; có thể truyền nhiều lần. Mặc định: tất cả thành phố.",
    )
    parser.add_argument(
        "--target",
        choices=("all", "daily", "hourly"),
        default="all",
        help="Loại mô hình cần huấn luyện. Mặc định: cả daily và hourly.",
    )
    args = parser.parse_args()

    cities = list(dict.fromkeys(args.city or SUPPORTED_CITIES))
    targets = ["daily", "hourly"] if args.target == "all" else [args.target]
    results = train_models(cities, targets)

    succeeded = sum(result["status"] == "success" for result in results)
    failed = len(results) - succeeded
    print("\n=== Tổng kết huấn luyện ===")
    for result in results:
        print(
            f"{result['status'].upper():7} | {result['city']:10} | "
            f"{result['target']:6} | {result['detail']}"
        )
    print(f"Hoàn tất: {succeeded}/{len(results)} thành công, {failed} thất bại.")

    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
