# Architecture Documentation

## System Overview

RackRank is an AI-first mobile application that reduces the friction of reselling clothing online from 10-20 minutes to under 3 minutes per item.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Mobile App (Expo)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ Camera View  │  │   Capture    │  │  Review & List   │  │
│  │  + Detection │  │   Checklist  │  │      Screen      │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   FastAPI Backend (Cloud Run)                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │   Gemini AI  │  │  eBay Browse │  │ Google Shopping  │  │
│  │  2.0 Flash   │  │     API      │  │      API         │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   PostgreSQL (Cloud SQL)                     │
│              Listings, Users, Price History                  │
└─────────────────────────────────────────────────────────────┘
```

## Component Details

### Mobile App

**Technology**: React Native + Expo + TypeScript

**Key Libraries**:
- `react-native-vision-camera`: High-performance camera with ML integration
- `react-native-fast-tflite`: On-device image classification (YOLOv8 + CLIP)

**Responsibilities**:
1. Camera capture with real-time object detection
2. Guided photo checklist with validation
3. Local ML inference for instant feedback
4. API calls to backend for listing generation

### Backend API

**Technology**: Python FastAPI

**Endpoints**:
- `POST /analyze`: Send photos, receive AI-generated listing
- `GET /price`: Get price suggestions from eBay sold data
- `POST /publish`: Create listing on eBay via Trading API

**Responsibilities**:
1. Gemini 2.0 Flash integration for title/description generation
2. eBay Browse API for price intelligence
3. Google Shopping API for brand enrichment
4. PostgreSQL for caching and user data

### Data Pipeline

**eBay Browse API** → Daily sync of sold listings → **PostgreSQL**

Cached pricing data enables instant suggestions without API rate limits.

## Deployment

### Google Cloud Platform

| Service | Purpose |
|---------|---------|
| Cloud Run | Serverless FastAPI backend |
| Cloud SQL | Managed PostgreSQL database |
| Secret Manager | API keys (Gemini, eBay) |
| Artifact Registry | Docker images |
| Cloud Build | CI/CD pipeline |

### GitHub Actions

On merge to `main`:
1. Run tests and linting
2. Build Docker image
3. Push to Artifact Registry
4. Deploy to Cloud Run

## Security

- API keys stored in GCP Secret Manager
- HTTPS enforced (Cloud Run default)
- CORS configured to mobile app domain only
- Rate limiting via FastAPI middleware

## Scalability

- Cloud Run auto-scales 0 → N instances
- PostgreSQL connection pooling
- Redis caching for hot data
- eBay API rate limits: 5,000 calls/day (cached locally)

---

For implementation details, see `/backend/main.py` and `/frontend/App.tsx`.
