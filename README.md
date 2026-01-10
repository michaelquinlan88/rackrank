# RackRank 📸👕

**Fast, intelligent clothing resale assistant powered by AI**

RackRank helps you scan, price, and list clothing items for resale on eBay and Facebook Marketplace. Just point your camera at a garment, and AI does the rest.

![Version](https://img.shields.io/badge/version-1.0.0--beta-orange)
![Platform](https://img.shields.io/badge/platform-iOS%20%7C%20Android-blue)

## ✨ Features

- **🔍 Instant Brand Detection** - AI identifies brands in <2 seconds
- **💰 Smart Pricing** - Get market-based price suggestions
- **📝 Auto-Generated Listings** - Title, description, and category created for you
- **📱 Multi-Platform Publishing** - List to eBay and Facebook Marketplace
- **📸 Guided Photo Capture** - 4-step workflow for perfect photos
- **🏷️ Size Detection** - Reads size from labels automatically

## 🛠️ Tech Stack

| Component | Technology |
|-----------|------------|
| **Mobile App** | React Native + Expo |
| **Backend API** | FastAPI (Python) |
| **AI Engine** | Google Gemini 2.0 Flash |
| **Marketplaces** | eBay API, FB Marketplace |
| **Storage** | AsyncStorage, expo-file-system |

## 📦 Project Structure

```
rack-rank/
├── frontend/          # React Native Expo app
│   ├── src/
│   │   ├── screens/   # App screens
│   │   ├── components/ # Reusable components
│   │   ├── services/  # API & storage services
│   │   ├── hooks/     # Custom React hooks
│   │   └── theme/     # Design system
│   └── assets/        # App icons & images
├── backend/           # FastAPI server
│   ├── main.py        # API endpoints
│   └── ebay_client.py # eBay integration
└── PRIVACY.md         # Privacy policy
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Python 3.9+
- Expo CLI (`npm install -g expo-cli`)
- Expo Go app on your phone

### Frontend Setup

```bash
cd frontend
npm install
npx expo start
```

Scan the QR code with Expo Go to run on your device.

### Backend Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Copy environment template
cp .env.example .env
# Edit .env with your API keys

uvicorn main:app --reload --host 0.0.0.0
```

## ⚙️ Environment Variables

### Backend (.env)

```env
# Required
GOOGLE_API_KEY=your_gemini_api_key

# Optional - eBay Integration
EBAY_CLIENT_ID=your_ebay_client_id
EBAY_CLIENT_SECRET=your_ebay_client_secret
EBAY_REDIRECT_URI=your_redirect_uri
EBAY_SANDBOX=true
```

### Frontend

Update the backend URL in Settings screen, or set:
```env
EXPO_PUBLIC_API_URL=http://your-backend-ip:8000
```

## 📱 App Screens

| Screen | Description |
|--------|-------------|
| **Scan** | Live camera with AI brand detection |
| **Capture** | 4-step guided photo workflow |
| **Review** | Edit AI-generated listing details |
| **History** | View and manage past listings |
| **Settings** | Configure backend, eBay, preferences |

## 🔌 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/analyze` | POST | Analyze photos with AI |
| `/health` | GET | Backend health check |
| `/connection-info` | GET | Get backend IP for mobile |
| `/ebay/status` | GET | Check eBay connection |
| `/ebay/auth-url` | POST | Get OAuth URL |

## 🎨 Brand Guidelines

- **Primary Color**: Hermès Orange (#F37021)
- **Typography**: Inter font family
- **Design**: Light mode, extreme whitespace, card-based UI

## 🧪 Building for Testing

### iOS (TestFlight)
```bash
cd frontend
npx eas-cli build --platform ios --profile preview
npx eas-cli submit --platform ios
```

### Android (APK)
```bash
cd frontend
npx eas-cli build --platform android --profile preview
```

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📧 Feedback

**feedback@rackrank.app**

---

**Built with ❤️ for resellers**
