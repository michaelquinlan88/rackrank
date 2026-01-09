# Development Setup Guide

## Prerequisites

Before you begin, ensure you have:

- **Node.js 18+** and npm
- **Python 3.11+**
- **Git**
- **Expo CLI**: `npm install -g expo-cli`
- **Google Cloud SDK** (for deployment)

## Initial Setup

### 1. Clone the Repository

```bash
git clone <your-github-repo-url>
cd rack-rack
```

### 2. Frontend Setup

```bash
cd frontend
npm install
```

**Run the app:**

```bash
npm start
```

This will start the Expo development server. You can:
- Press `i` for iOS simulator
- Press `a` for Android emulator
- Scan the QR code with the Expo Go app on your phone

### 3. Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

**Configure environment:**

```bash
cp .env.example .env
# Edit .env and add your API keys
```

**Run the server:**

```bash
uvicorn main:app --reload
```

The API will be available at `http://localhost:8000`. View docs at `http://localhost:8000/docs`.

## GitHub Setup

### Required Secrets

Add these secrets to your GitHub repository (Settings → Secrets and variables → Actions):

| Secret Name | Description |
|-------------|-------------|
| `GCP_PROJECT_ID` | Your Google Cloud project ID |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | Workload identity provider for GCP |
| `GCP_SERVICE_ACCOUNT` | Service account email for deployments |

### Branch Protection

Configure `main` branch protection:
- Require pull request reviews
- Require status checks to pass
- No direct pushes to main

## Google Cloud Platform Setup

### 1. Create GCP Project

```bash
gcloud projects create YOUR_PROJECT_ID
gcloud config set project YOUR_PROJECT_ID
```

### 2. Enable Required APIs

```bash
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable sqladmin.googleapis.com
gcloud services enable secretmanager.googleapis.com
```

### 3. Create Cloud SQL Instance

```bash
gcloud sql instances create ractrack-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-central1
```

### 4. Store Secrets

```bash
echo -n "your_gemini_api_key" | gcloud secrets create GOOGLE_API_KEY --data-file=-
echo -n "your_ebay_app_id" | gcloud secrets create EBAY_APP_ID --data-file=-
```

### 5. Deploy Backend (Manual First Deploy)

```bash
cd backend
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/ractrack-api
gcloud run deploy ractrack-api \
  --image gcr.io/YOUR_PROJECT_ID/ractrack-api \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

After the first manual deploy, GitHub Actions will handle subsequent deploys.

## API Keys

### Gemini AI

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create an API key
3. Add to `.env` as `GOOGLE_API_KEY`

### eBay Developer

1. Register at [eBay Developers Program](https://developer.ebay.com/)
2. Create an application
3. Get App ID and Cert ID
4. Add to `.env`

## Development Workflow

1. Create feature branch: `git checkout -b feature/your-feature`
2. Make changes and commit
3. Push to GitHub: `git push origin feature/your-feature`
4. Create Pull Request
5. After review and approval, merge to `main`
6. GitHub Actions will automatically deploy to Cloud Run

## Testing

**Backend:**

```bash
cd backend
pytest
```

**Frontend:**

```bash
cd frontend
npm test
```

**Linting:**

```bash
# Frontend
cd frontend
npm run lint

# Backend
cd backend
flake8 .
```

## Troubleshooting

### "Module not found" errors
- Frontend: Delete `node_modules` and run `npm install`
- Backend: Ensure virtual environment is activated

### Cloud Run deployment fails
- Check GCP quotas and billing
- Verify secrets are correctly configured
- Review Cloud Build logs in GCP Console

### Expo app won't load
- Clear Expo cache: `expo start -c`
- Restart development server
- Check that backend is running if testing API calls

---

For architecture details, see [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md).
