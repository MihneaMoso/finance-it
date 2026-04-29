from __future__ import annotations

import os
import pickle
from typing import Dict, List, Tuple

from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from data.preprocessing import Interaction, build_training_data
from utils.firestore_client import get_db


MODEL_PATH = os.path.join(os.path.dirname(__file__), "model.pkl")


def _fetch_skill_levels(db) -> Dict[str, str]:
    skill: Dict[str, str] = {}
    for doc in db.collection("users").stream():
        data = doc.to_dict() or {}
        lvl = data.get("skillLevel")
        if isinstance(lvl, str) and lvl:
            skill[doc.id] = lvl
    return skill


def _fetch_interactions(db) -> List[Interaction]:
    out: List[Interaction] = []

    # Collection group query: users/{userId}/interactions/{interactionId}
    for doc in db.collection_group("interactions").stream():
        data = doc.to_dict() or {}

        # Resolve userId from path: users/{userId}/interactions/{docId}
        try:
            user_id = doc.reference.parent.parent.id
        except Exception:
            user_id = data.get("userId")

        if not user_id:
            continue

        concept_id = data.get("conceptId")
        question_id = data.get("questionId")
        difficulty = data.get("difficulty")
        correct = data.get("correct")
        response_time = data.get("responseTime")
        timestamp = data.get("timestamp")

        if not (concept_id and question_id and difficulty and isinstance(correct, bool)):
            continue

        if not isinstance(timestamp, int):
            continue

        if not isinstance(response_time, (int, float)):
            response_time = 0.0

        out.append(
            Interaction(
                user_id=str(user_id),
                question_id=str(question_id),
                concept_id=str(concept_id),
                difficulty=str(difficulty),
                correct=bool(correct),
                response_time=float(response_time),
                timestamp=int(timestamp),
            )
        )

    return out


def train_global_model() -> Tuple[int, str]:
    """Train a global logistic regression model and persist it.

    Returns (num_samples, model_path)
    """

    db = get_db()
    skill_levels = _fetch_skill_levels(db)
    interactions = _fetch_interactions(db)

    if len(interactions) < 20:
        raise RuntimeError(
            f"Not enough interaction data to train (need ~20+, have {len(interactions)})."
        )

    X, y, feature_names = build_training_data(interactions, skill_levels)

    model = Pipeline(
        steps=[
            ("scaler", StandardScaler()),
            (
                "clf",
                LogisticRegression(
                    max_iter=1000,
                    class_weight="balanced",
                    solver="lbfgs",
                ),
            ),
        ]
    )

    model.fit(X, y)

    artifact = {"model": model, "feature_names": feature_names}
    with open(MODEL_PATH, "wb") as f:
        pickle.dump(artifact, f)

    return int(X.shape[0]), MODEL_PATH


if __name__ == "__main__":
    n, p = train_global_model()
    print(f"Trained on {n} samples → {p}")
