# RackRack

AI-first mobile application for scanning clothing items and quickly creating resale listings.

## 📋 Overview

RackRack dramatically reduces the friction of reselling clothes online by:
- **Scanning** items with AI-powered detection
- **Ranking** top 2-3 items by resale value
- **Capturing** guided photos with quality checks
- **Generating** AI-powered listings (title, description, price)
- **Publishing** to eBay, Depop, and Facebook Marketplace

**Target**: Complete scan-to-list in < 3 minutes (vs. 10-20 min manual baseline)

---

## 🏗️ Architecture

```
rack-rack/
├── frontend/          # React Native + Expo mobile app
├── backend/           # Python FastAPI server
├── docs/              # System documentation
└── .github/workflows/ # CI/CD pipelines
```

### Technology Stack

| Layer | Technology |
|-------|------------|
| Mobile | Expo + React Native + TypeScript |
| Camera | react-native-vision-camera |
| ML Runtime | react-native-fast-tflite |
| Backend | Python FastAPI + Redis |
| Database | PostgreSQL (Cloud SQL) |
| AI Generation | Gemini 2.0 Flash |
| Infrastructure | Google Cloud Platform |
| Version Control | GitHub with CI/CD |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Expo CLI (`npm install -g expo-cli`)
- Python 3.11+
- Google Cloud SDK (for deployment)

### Frontend Setup

```bash
cd frontend
npm install
npm start
```

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

---

## 📱 Key Features

### 1. Guided Capture Checklist

Step-by-step photo prompts ensure quality listings:
- Front view
- Back view
- Label/tag (brand & size)
- Material tag
- Defects (if any)
- Detail shot

Real-time validation prevents blurry photos and missing required fields.

### 2. AI-Powered Listing Generation

Gemini 2.0 Flash generates:
- SEO-optimized title
- Compelling description
- Accurate category
- Price suggestion (based on eBay sold data)
- Item condition assessment

### 3. Multi-Marketplace Publishing

- **eBay**: Direct API integration
- **Depop**: Deep link + clipboard pre-fill
- **Facebook Marketplace**: Share intent

---

## 🔧 Development

### Code Documentation Standards

- **Frontend**: JSDoc/TSDoc for TypeScript
- **Backend**: Google-style Python docstrings
- **System**: Markdown in `/docs`

### Branch Strategy

- `main`: Production-ready code
- `develop`: Integration branch
- Feature branches: `feature/description`

### CI/CD Pipeline

GitHub Actions automatically:
1. Run tests and linting
2. Build Docker images
3. Deploy to Google Cloud Run (on merge to main)

---

## 🎯 MVP Roadmap

**Phase 1** (10 weeks): Core scan, guided capture, AI listing generation, eBay integration

**Phase 2** (6 weeks): Brand recognition (1000+ brands), condition assessment, seasonal trends

**Phase 3** (4 weeks): Batch scanning, analytics dashboard

---

## 📊 Success Metrics

| Metric | Target |
|--------|--------|
| Median scan-to-list time | < 3 minutes |
| Listings created/user/week | 5+ |
| AI draft acceptance rate | 70%+ |
| Price prediction accuracy | ±15% |

---

## 📄 License

TBD

---

*Built with clean engineering principles and an AI-first approach.*
