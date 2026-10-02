"""Chọn tập con train cho GPR mà vẫn giữ đại diện theo mùa.

``choose_training_indices`` là API công khai: nó giữ một phần dữ liệu gần
nhất và lấy mẫu phần lịch sử theo tháng. ``_month_numbers`` và
``_sample_month_stratified`` là các bước nội bộ để nhận biết tháng và phân
bổ mẫu lịch sử cân bằng.

(Tích hợp từ ml_test/training_selection.py)
"""

from __future__ import annotations

from typing import Optional

import numpy as np


TRAINING_SELECTION_DESCRIPTION = (
    "recent_plus_month_stratified: giữ phần dữ liệu gần nhất theo recent_ratio; "
    "phần lịch sử còn lại được lấy cân bằng theo tháng trong năm"
)


def _month_numbers(timestamps: np.ndarray) -> Optional[np.ndarray]:
    """Trả tháng 0..11 hoặc None nếu timestamp không đổi được sang datetime."""
    try:
        values = np.asarray(timestamps).astype("datetime64[M]")
        if np.isnat(values).any():
            return None
        return values.astype("int64") % 12
    except (TypeError, ValueError):
        return None


def _sample_month_stratified(
    candidates: np.ndarray,
    months: np.ndarray,
    sample_size: int,
    rng: np.random.Generator,
) -> np.ndarray:
    """Lấy mẫu lịch sử gần cân bằng giữa các tháng có dữ liệu."""
    groups = [
        candidates[months[candidates] == month]
        for month in range(12)
        if np.any(months[candidates] == month)
    ]
    if not groups:
        return rng.choice(candidates, size=sample_size, replace=False)

    # Mỗi tháng có một quota gần bằng nhau trước. Phần quota không thể lấy
    # (tháng có quá ít dữ liệu) được phân bổ lại ngẫu nhiên ở các điểm còn lại.
    base_quota, extra = divmod(sample_size, len(groups))
    extra_groups = set(rng.permutation(len(groups))[:extra])
    selected_parts = []
    remaining_parts = []
    for group_index, group in enumerate(groups):
        quota = base_quota + (1 if group_index in extra_groups else 0)
        take = min(quota, len(group))
        if take:
            chosen = rng.choice(group, size=take, replace=False)
            selected_parts.append(chosen)
            remaining_parts.append(np.setdiff1d(group, chosen, assume_unique=False))
        else:
            remaining_parts.append(group)

    selected = np.concatenate(selected_parts) if selected_parts else np.array([], dtype=int)
    missing = sample_size - len(selected)
    if missing:
        remainder = np.concatenate(remaining_parts)
        selected = np.concatenate(
            [selected, rng.choice(remainder, size=missing, replace=False)]
        )
    return selected


def choose_training_indices(
    n_rows: int,
    max_train_size: Optional[int],
    recent_ratio: float,
    random_state: int,
    timestamps: Optional[np.ndarray] = None,
) -> np.ndarray:
    """Chọn index train: gần đây + lịch sử được cân bằng theo mùa.

    GPR có chi phí O(n³), vì vậy không thể đưa toàn bộ lịch sử nhiều năm vào
    kernel. Hàm này tránh việc phần lấy ngẫu nhiên vô tình chứa quá nhiều mẫu
    của một mùa, trong khi vẫn ưu tiên dữ liệu mới để thích nghi concept drift.
    """
    if max_train_size is None or n_rows <= max_train_size:
        return np.arange(n_rows)

    n_recent = int(round(max_train_size * recent_ratio))
    n_recent = min(max(n_recent, 0), max_train_size)
    n_history = max_train_size - n_recent
    recent_indices = np.arange(n_rows - n_recent, n_rows)
    historical_indices = np.arange(0, n_rows - n_recent)

    if n_history <= 0 or not len(historical_indices):
        return recent_indices

    n_history = min(n_history, len(historical_indices))
    rng = np.random.default_rng(random_state)
    months = _month_numbers(timestamps) if timestamps is not None else None
    if months is None or len(months) != n_rows:
        historical_sample = rng.choice(
            historical_indices, size=n_history, replace=False
        )
    else:
        historical_sample = _sample_month_stratified(
            historical_indices, months, n_history, rng
        )
    return np.sort(np.concatenate([historical_sample, recent_indices]))
