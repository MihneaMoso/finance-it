from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Iterable, List, Tuple

import numpy as np


DIFFICULTY_ENCODED = {"easy": 0.0, "medium": 1.0, "hard": 2.0}
SKILL_ENCODED = {"beginner": 0.0, "intermediate": 1.0, "advanced": 2.0}


def encode_difficulty(difficulty: str | None) -> float:
    if not difficulty:
        return DIFFICULTY_ENCODED["medium"]
    return DIFFICULTY_ENCODED.get(difficulty, DIFFICULTY_ENCODED["medium"])


def encode_skill_level(skill_level: str | None) -> float:
    if not skill_level:
        return SKILL_ENCODED["beginner"]
    return SKILL_ENCODED.get(skill_level, SKILL_ENCODED["beginner"])


def recency_score(now_ts_ms: int, last_ts_ms: int | None) -> float:
    """Return a 0..1 score where 1 means *very stale/long ago*.

    We want the model to see that long gaps can correlate with mistakes.
    Uses a simple saturating function.
    """

    if not last_ts_ms:
        return 1.0
    delta_ms = max(0, now_ts_ms - last_ts_ms)
    delta_minutes = delta_ms / 60000.0
    # 0 minutes -> 0.0, >= 60 minutes -> 1.0
    return float(min(delta_minutes / 60.0, 1.0))


@dataclass
class Interaction:
    user_id: str
    question_id: str
    concept_id: str
    difficulty: str
    correct: bool
    response_time: float
    timestamp: int


def build_training_data(
    interactions: Iterable[Interaction],
    skill_level_by_user: Dict[str, str] | None = None,
) -> Tuple[np.ndarray, np.ndarray, List[str]]:
    """Build X, y for global logistic regression.

    Features per (interaction) based on *state before the attempt*:
    - accuracy (correct/attempts so far for that user+concept)
    - avg_response_time
    - attempts
    - difficulty_encoded
    - recency_score
    - skill_encoded

    Target:
    - y = correct (1/0)
    """

    skill_level_by_user = skill_level_by_user or {}

    # sort by time (rolling aggregates)
    interactions_sorted = sorted(interactions, key=lambda r: r.timestamp)

    # rolling stats keyed by (user, concept)
    attempts: Dict[tuple[str, str], int] = {}
    corrects: Dict[tuple[str, str], int] = {}
    avg_time: Dict[tuple[str, str], float] = {}
    last_ts: Dict[tuple[str, str], int] = {}

    X_rows: List[List[float]] = []
    y_rows: List[int] = []

    for r in interactions_sorted:
        key = (r.user_id, r.concept_id)

        a = attempts.get(key, 0)
        c = corrects.get(key, 0)
        t = avg_time.get(key, 0.0)
        lt = last_ts.get(key)

        accuracy = (c / a) if a > 0 else 0.0
        skill = encode_skill_level(skill_level_by_user.get(r.user_id))

        X_rows.append(
            [
                float(accuracy),
                float(t),
                float(a),
                float(encode_difficulty(r.difficulty)),
                float(recency_score(r.timestamp, lt)),
                float(skill),
            ]
        )
        y_rows.append(1 if r.correct else 0)

        # update rolling stats with this attempt
        next_a = a + 1
        next_c = c + (1 if r.correct else 0)

        next_avg_time = (
            (t * a + float(r.response_time)) / next_a if next_a > 0 else float(r.response_time)
        )

        attempts[key] = next_a
        corrects[key] = next_c
        avg_time[key] = next_avg_time
        last_ts[key] = int(r.timestamp)

    feature_names = [
        "accuracy",
        "avg_response_time",
        "attempts",
        "difficulty_encoded",
        "recency_score",
        "skill_encoded",
    ]

    X = np.asarray(X_rows, dtype=np.float32)
    y = np.asarray(y_rows, dtype=np.int32)
    return X, y, feature_names
