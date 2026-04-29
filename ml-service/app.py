from __future__ import annotations

import os
from typing import Any, Dict, List, Optional

from flask import Flask, jsonify, request
from firebase_admin import firestore

from model.predictor import recommend_concepts, reload_model
from model.trainer import train_global_model
from utils.firestore_client import get_db


app = Flask(__name__)


def _default_streak(today: str) -> Dict[str, Any]:
    return {"current": 0, "longest": 0, "lastActiveDate": today}


def _is_yyyy_mm_dd(s: Any) -> bool:
    if not isinstance(s, str):
        return False
    
    if len(s) != 10:
        return False
    if s[4] != "-" or s[7] != "-":
        return False
    return s[:4].isdigit() and s[5:7].isdigit() and s[8:10].isdigit()


def _json_error(message: str, status: int = 400):
    return jsonify({"error": message}), status


def _compute_skill_level(total_answered: int, correct_answers: int, avg_response_time_ms: float) -> str:
    

    accuracy = (correct_answers / total_answered) if total_answered > 0 else 0.0

    if accuracy < 0.5:
        return "beginner"
    if accuracy <= 0.8:
        return "intermediate"

    if avg_response_time_ms > 0 and avg_response_time_ms < 7000:
        return "advanced"
    return "intermediate"


@app.get("/health")
def health():
    return jsonify({"ok": True})


@app.post("/train")
def train():
    try:
        n, path = train_global_model()
        reload_model()
        return jsonify({"ok": True, "trainedOn": n, "modelPath": path})
    except Exception as e:
        return _json_error(str(e), 500)


@app.post("/recommend")
def recommend():
    body = request.get_json(silent=True) or {}

    user_id = body.get("userId")
    concept_ids = body.get("conceptIds")

    if not isinstance(user_id, str) or not user_id:
        return _json_error("userId is required")
    if not isinstance(concept_ids, list) or not all(isinstance(c, str) for c in concept_ids):
        return _json_error("conceptIds must be an array of strings")

    rec = recommend_concepts(user_id=user_id, concept_ids=concept_ids)

    return jsonify(
        {
            "rankedConcepts": rec.ranked_concepts,
            
            "pCorrectByConcept": rec.p_correct_by_concept,
        }
    )


@app.post("/interactions/record")
def record_interaction():
    body = request.get_json(silent=True) or {}

    user_id = body.get("userId")
    question_id = body.get("questionId")
    concept_id = body.get("conceptId")
    difficulty = body.get("difficulty")
    correct = body.get("correct")
    response_time = body.get("responseTime")
    timestamp = body.get("timestamp")

    if not isinstance(user_id, str) or not user_id:
        return _json_error("userId is required")
    if not isinstance(question_id, str) or not question_id:
        return _json_error("questionId is required")
    if not isinstance(concept_id, str) or not concept_id:
        return _json_error("conceptId is required")
    if difficulty not in ("easy", "medium", "hard"):
        return _json_error("difficulty must be easy|medium|hard")
    if not isinstance(correct, bool):
        return _json_error("correct must be boolean")
    if not isinstance(timestamp, int):
        return _json_error("timestamp must be an integer (ms)")

    if not isinstance(response_time, (int, float)):
        response_time = 0

    db = get_db()

    user_ref = db.collection("users").document(user_id)
    interaction_ref = user_ref.collection("interactions").document()

    @firestore.transactional
    def txn_fn(tx: firestore.Transaction):
        user_snap = tx.get(user_ref)
        user_doc = user_snap.to_dict() or {}

        stats = user_doc.get("stats") if isinstance(user_doc.get("stats"), dict) else {}
        concept_stats = (
            user_doc.get("conceptStats") if isinstance(user_doc.get("conceptStats"), dict) else {}
        )

        
        prev_total = int(stats.get("totalAnswered") or 0)
        prev_correct = int(stats.get("correctAnswers") or 0)
        prev_avg = float(stats.get("avgResponseTime") or 0)

        next_total = max(0, prev_total + 1)
        next_correct = max(0, prev_correct + (1 if correct else 0))
        next_avg = (
            (prev_avg * prev_total + float(response_time)) / next_total if next_total > 0 else float(response_time)
        )

        next_skill = _compute_skill_level(next_total, next_correct, next_avg)

        # per-concept aggregates
        cs = concept_stats.get(concept_id) if isinstance(concept_stats, dict) else None
        if not isinstance(cs, dict):
            cs = {}

        prev_attempts = int(cs.get("attempts") or 0)
        prev_c = int(cs.get("correct") or 0)
        prev_t = float(cs.get("avgTime") or 0)

        next_attempts = max(0, prev_attempts + 1)
        next_c = max(0, prev_c + (1 if correct else 0))
        next_t = (
            (prev_t * prev_attempts + float(response_time)) / next_attempts if next_attempts > 0 else float(response_time)
        )

        concept_stats[concept_id] = {
            "attempts": next_attempts,
            "correct": next_c,
            "avgTime": next_t,
            "lastAttemptAt": timestamp,
            "lastDifficulty": difficulty,
        }

        tx.set(
            user_ref,
            {
                "clerkUserId": user_id,
                "stats": {
                    "totalAnswered": next_total,
                    "correctAnswers": next_correct,
                    "avgResponseTime": next_avg,
                },
                "skillLevel": next_skill,
                "conceptStats": concept_stats,
                "updatedAt": firestore.SERVER_TIMESTAMP,
            },
            merge=True,
        )

        tx.set(
            interaction_ref,
            {
                "questionId": question_id,
                "conceptId": concept_id,
                "difficulty": difficulty,
                "correct": correct,
                "responseTime": float(response_time),
                "timestamp": timestamp,
            },
        )

    try:
        txn_fn(db.transaction())
    except Exception as e:
        return _json_error(str(e), 500)

    return jsonify({"ok": True})


@app.get("/streak/<user_id>")
def get_streak(user_id: str):
    if not isinstance(user_id, str) or not user_id:
        return _json_error("userId is required")

    db = get_db()
    user_ref = db.collection("users").document(user_id)
    snap = user_ref.get()
    doc = snap.to_dict() or {}
    streak = doc.get("streak") if isinstance(doc.get("streak"), dict) else None

    if not isinstance(streak, dict):
        return jsonify({"ok": True, "streak": None})

    return jsonify(
        {
            "ok": True,
            "streak": {
                "current": int(streak.get("current") or 0),
                "longest": int(streak.get("longest") or 0),
                "lastActiveDate": str(streak.get("lastActiveDate") or ""),
            },
        }
    )


@app.post("/streak/upsert")
def upsert_streak():
    body = request.get_json(silent=True) or {}

    user_id = body.get("userId")
    streak = body.get("streak")

    if not isinstance(user_id, str) or not user_id:
        return _json_error("userId is required")
    if not isinstance(streak, dict):
        return _json_error("streak must be an object")

    current = streak.get("current")
    longest = streak.get("longest")
    last_active_date = streak.get("lastActiveDate")

    if not isinstance(current, int) or current < 0:
        return _json_error("streak.current must be a non-negative integer")
    if not isinstance(longest, int) or longest < 0:
        return _json_error("streak.longest must be a non-negative integer")
    if not _is_yyyy_mm_dd(last_active_date):
        return _json_error("streak.lastActiveDate must be YYYY-MM-DD")

    db = get_db()
    user_ref = db.collection("users").document(user_id)

    try:
        user_ref.set(
            {
                "clerkUserId": user_id,
                "streak": {
                    "current": current,
                    "longest": max(longest, current),
                    "lastActiveDate": last_active_date,
                },
                "updatedAt": firestore.SERVER_TIMESTAMP,
            },
            merge=True,
        )
    except Exception as e:
        return _json_error(str(e), 500)

    return jsonify({"ok": True})


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "5000"))
    app.run(host="0.0.0.0", port=port, debug=True)
