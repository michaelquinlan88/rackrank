# RackRank Learnings

Accumulated patterns, gotchas, and useful context discovered during development.

---

## Theme System
- Theme file: `frontend/src/theme/index.ts`
- Primary color (Hermès orange): `#F37021`
- All screens import from `../theme`

## Navigation
- RootNavigator uses bottom tabs with 3 screens: Scan, History, Settings
- ScanStack contains nested: ScanHome → Capture → Review

## EAS Build
- Project ID: `b38561b2-2592-4429-94e0-1a7b2bd74cb4`
- Account: `@michaelquinlan88`
- Bundle ID: `com.rackrank.app`

## Backend
- FastAPI at `backend/main.py`
- Gemini 2.0 Flash for AI analysis
- eBay Browse API for price intelligence
