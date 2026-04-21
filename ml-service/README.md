# ML Service (Python)

Simple, interpretable question recommender using scikit-learn + Firestore.

## Setup

```bash
cd ml-service
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Firestore credentials

Uses Firebase Admin SDK with Application Default Credentials.

Choose one:

- Service account JSON:
    - Download a service account key JSON
    - `export GOOGLE_APPLICATION_CREDENTIALS=/abs/path/to/key.json`

- Or local dev ADC:
    - `gcloud auth application-default login`

## Run

```bash
python app.py
```

Health: `GET /health`

## Smoke test (recommended)

1. Ensure credentials are configured (see above)
2. Start the service: `python app.py`
3. In another terminal:

```bash
bash scripts/smoke_test.sh http://localhost:5000 test-user
```

This will:

- `POST /interactions/record` a few times
- `POST /train`
- `POST /recommend`

Then verify in Firestore Console:

- `users/test-user` has `conceptStats` + `stats`
- `users/test-user/interactions/*` has new docs

## Train

```bash
curl -X POST http://localhost:5000/train
```

## Recommend

```bash
curl -X POST http://localhost:5000/recommend \
  -H 'content-type: application/json' \
  -d '{"userId":"USER_ID","conceptIds":["compound_interest","inflation"]}'
```

## Record interaction

```bash
curl -X POST http://localhost:5000/interactions/record \
  -H 'content-type: application/json' \
  -d '{"userId":"USER_ID","questionId":"q1","conceptId":"inflation","difficulty":"easy","correct":false,"responseTime":3200,"timestamp":1710000000000}'
```

## Production deployment (alongside the app)

The Expo app calls this service over HTTPS using `fetch` (see [services/MLService.ts](../services/MLService.ts)).

### Option A: Google Cloud Run (recommended MVP)

1. Build & deploy container (example):

```bash
cd ml-service
gcloud run deploy finance-it-ml \
  --source . \
  --region <region> \
  --allow-unauthenticated
```

2. Provide Firestore Admin credentials securely (recommended):

- Use Workload Identity / service account attached to the Cloud Run service with Firestore access.
- Avoid shipping a JSON key when possible.

3. Set the app env var:

- Add `EXPO_PUBLIC_ML_SERVICE_URL=https://<your-cloud-run-url>`
- For EAS builds, create an EAS secret with the same name.

### Option B: Fly.io / Render / Railway

Same idea: deploy the container and configure credentials + `PORT`.

### Important production notes

- **Auth**: the current API trusts `userId` (MVP). Before real production, add request authentication (e.g. verify a Clerk JWT on the ML service).
- **Latency**: `/recommend` does one user doc read (`users/{userId}`) + in-memory model inference.
- **Web**: if you ship Expo web, you may need to enable CORS on Flask.
