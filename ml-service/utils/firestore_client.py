from __future__ import annotations

import firebase_admin
from firebase_admin import credentials, firestore


def get_db() -> firestore.Client:
    """Return a Firestore client using Application Default Credentials.

    Auth options (choose one):
    - Set GOOGLE_APPLICATION_CREDENTIALS=/abs/path/to/service-account.json
    - Or use `gcloud auth application-default login` locally.

    This code uses Firebase Admin SDK, so it bypasses Firestore Security Rules.
    """

    if not firebase_admin._apps:
        firebase_admin.initialize_app(
            credential=credentials.ApplicationDefault(),
        )

    return firestore.client()
