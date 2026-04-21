from __future__ import annotations

import os
import pickle
from dataclasses import dataclass
from typing import Dict, List, Tuple

import numpy as np

from data.preprocessing import encode_difficulty, encode_skill_level, recency_score
from utils.firestore_client import get_db


MODEL_PATH = os.path.join(os.path.dirname(__file__), "model.pkl")

_MODEL_CACHE = None


@dataclass
class Recommendation:
    ranked_concepts: List[str]
    p_correct_by_concept: Dict[str, float]


def _load_model(force_reload: bool = False):
    global _MODEL_CACHE

    if _MODEL_CACHE is not None and not force_reload:
        return _MODEL_CACHE

    if not os.path.exists(MODEL_PATH):
        _MODEL_CACHE = None
        return None

    with open(MODEL_PATH, "rb") as f:
        artifact = pickle.load(f)

    _MODEL_CACHE = artifact.get("model")
    return _MODEL_CACHE


def reload_model() -> None:
    _load_model(force_reload=True)


def _fetch_user_aggregate(user_id: str) -> dict:
    db = get_db()
    snap = db.collection("users").document(user_id).get()
    return snap.to_dict() or {}


def recommend_concepts(user_id: str, concept_ids: List[str]) -> Recommendation:
    """Rank concepts by predicted probability of correct (ascending).

    If the model is missing/untrained, uses a simple interpretable fallback:
    - Prefer concepts with lower accuracy, then fewer attempts, then staler recency.

    TODO (future):
    - Deep learning models
    - Sequence models (LSTM)
    - Reinforcement learning
    """

    user_doc = _fetch_user_aggregate(user_id)
    concept_stats = (user_doc.get("conceptStats") or {}) if isinstance(user_doc.get("conceptStats"), dict) else {}
    skill_level = user_doc.get("skillLevel") if isinstance(user_doc.get("skillLevel"), str) else None

    now_ms = int(__import__("time").time() * 1000)

    model = _load_model()

    # Build per-concept features
    features = []
    kept_concepts = []

    for cid in concept_ids:
        stats = concept_stats.get(cid) if isinstance(concept_stats, dict) else None
        if not isinstance(stats, dict):
            stats = {}

        attempts = float(stats.get("attempts") or 0)
        correct = float(stats.get("correct") or 0)
        avg_time = float(stats.get("avgTime") or 0)
        last_attempt = stats.get("lastAttemptAt")
        last_diff = stats.get("lastDifficulty")

        accuracy = (correct / attempts) if attempts > 0 else 0.0

        row = [
            float(accuracy),
            float(avg_time),
            float(attempts),
            float(encode_difficulty(str(last_diff) if last_diff else None)),
            float(recency_score(now_ms, int(last_attempt) if isinstance(last_attempt, int) else None)),
            float(encode_skill_level(str(skill_level) if skill_level else None)),
        ]

        features.append(row)
        kept_concepts.append(cid)

    if not kept_concepts:
        return Recommendation(ranked_concepts=[], p_correct_by_concept={})

    X = np.asarray(features, dtype=np.float32)

    if model is None:
        # fallback heuristic ranking (no ML): lower accuracy first, then fewer attempts, then staler
        scored: List[Tuple[str, float]] = []
        for cid, row in zip(kept_concepts, features, strict=False):
            accuracy, _avg_t, attempts, _d, recency, _skill = row
            weakness = (1.0 - accuracy) * 0.7 + (1.0 / (1.0 + attempts)) * 0.2 + recency * 0.1
            scored.append((cid, weakness))

        scored.sort(key=lambda x: x[1], reverse=True)
        ranked = [c for c, _ in scored]
        return Recommendation(ranked_concepts=ranked, p_correct_by_concept={})

    # predict p(correct)
    proba = model.predict_proba(X)[:, 1]
    p_correct_by_concept = {cid: float(p) for cid, p in zip(kept_concepts, proba, strict=False)}

    ranked = sorted(kept_concepts, key=lambda c: p_correct_by_concept.get(c, 0.5))
    return Recommendation(ranked_concepts=ranked, p_correct_by_concept=p_correct_by_concept)
