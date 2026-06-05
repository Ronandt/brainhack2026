# Bloodline — Singapore Blood Supply Crisis-Resilience Platform

Hackathon project built for Brainhack 2026. Helps HSA (Health Sciences Authority) manage blood supply shortages by connecting donors, hospitals, and administrators.

## Architecture

**Serverless AWS stack** — no persistent servers.

```
Frontend (React + Vite)  →  API Gateway  →  Lambda functions  →  DynamoDB
                                    ↑
                          EventBridge (scheduled jobs)
```

- **Frontend**: React 18 SPA, hosted on S3 + CloudFront
- **Backend**: 10 Python 3.13 Lambda functions, each owns one domain
- **Auth**: Cognito User Pools with JWT — all API routes require a valid token except OPTIONS
- **IaC**: AWS SAM (`template.yaml`) — deploy with `deploy.ps1`

## User Roles

| Role | Cognito Group | Dashboard |
|------|--------------|-----------|
| Donor | (default) | Mobile-first tab bar: Home, Drives, Impact, You |
| HSA Admin | `HSAAdmin` | Dark sidebar console: Forecast, Surge Mode, Drive queue, Donor pool, Hospital demand |
| Hospital Staff | `HospitalStaff` | Dark sidebar: My Slots, Create Slot |

## Lambda Functions

Each function lives in `src/<name>/handler.py` with its own `requirements.txt`.

| Function | Path | Purpose |
|----------|------|---------|
| `donors` | `/api/v1/donors/me` | Donor profile CRUD, eligibility countdown |
| `predict` | `/api/v1/predict/status`, `/forecast` | 14-day shortage forecast from DynamoDB; refreshed hourly via EventBridge |
| `surge` | `/api/v1/surge/activate`, `/monitor` | HSA break-glass surge alert; publishes to SNS |
| `notify` | (SNS trigger) | Dispatches push/SMS to eligible donors by blood type + geo tier |
| `schedule` | `/api/v1/slots`, `/schedule/drives`, `/schedule/book` | Slot and blood drive management |
| `retain` | `/api/v1/retain/stats` | Impact stats, badges, donation streaks |
| `hsa-sync` | `/api/v1/blood-stock` + EventBridge | **Scrapes Red Cross SG every 15 min** for real blood stock levels; serves cached data via GET |
| `admin` | `/api/v1/admin/*` | HSA console: donor segments, drive approvals, stock overview |
| `hospital` | `/api/v1/hospital/*` | Hospital profile, slot creation, drive submission |
| `diagnostics` | `/api/v1/admin/diagnostics`, `/trigger` | Health checks, invoke scheduled functions manually |

## Blood Stock Scraping

`src/hsa-sync/handler.py` scrapes `https://redcross.sg/` every 15 minutes via EventBridge:
- Parses `.blood-grp-img` blocks for blood type (`h3`), status (`h5`: Healthy/Moderate/Low/Critical)
- Extracts percentage from HTML comment (`<!-- 67 -->`) inside `.blood-grp-hover`
- Writes to DynamoDB `BloodStockTable` (PK: `bloodType`, SK: `updatedAt`)
- GET `/api/v1/blood-stock` reads latest row per blood type and returns JSON

Frontend shows this as a "Live stock · Red Cross SG" card in `HomePanel.jsx` with colour-coded progress bars.

## Frontend Structure

```
frontend/src/
  App.jsx              — auth gate → Dashboard
  components/
    Dashboard.jsx      — role-based layout (donor/admin/hospital)
    HomePanel.jsx      — donor home: eligibility, live blood stock, slot booking
    DonorDrivesPanel.jsx
    ImpactPanel.jsx
    DonorPanel.jsx
    admin/             — HSA admin panels
    hospital/          — hospital staff panels
  api.js               — authenticated fetch wrapper; all exported functions call /api/v1/...
  auth.js              — Cognito sign-in/sign-up/sign-out
  tokens.js            — design system: BL.sans, BL.mono, BL.ink, BL.need.{ok/low/urgent/critical}
  config.js            — reads VITE_API_URL, VITE_COGNITO_* from .env.local
```

## Design Tokens

All styling uses inline styles with `BL` tokens from `tokens.js`:
- `BL.need.ok` / `low` / `urgent` / `critical` — each has `.fg` and `.bg` for status colours
- `BL.ink`, `BL.muted`, `BL.faint`, `BL.hair`, `BL.fill`, `BL.card`, `BL.paper`
- `BL.sans` (IBM Plex Sans), `BL.mono` (IBM Plex Mono)

## Build & Deploy

```powershell
# Backend
sam build
sam deploy --guided   # first time; subsequent runs: sam deploy

# Frontend
cd frontend
npm install
npm run build
# Upload dist/ to S3 bucket (output from sam deploy: FrontendBucketName)
```

Or run everything with:
```powershell
.\deploy.ps1
```

### Environment

- Python 3.13 required (changed from 3.12 to match available runtime)
- Dependencies installed per-function via `src/<name>/requirements.txt` (no shared Lambda layer)
- Frontend needs `frontend/.env.local` — copy from `.env.example` and fill in SAM deploy outputs

## DynamoDB Tables

All tables use `PAY_PER_REQUEST` billing. Key schemas:

| Table | PK | SK |
|-------|----|----|
| donors | `donorId` | — |
| donations | `donorId` | `donatedAt` |
| predictions | `bloodType` | `forecastDate` |
| blood-stock | `bloodType` | `updatedAt` |
| drives | `driveId` | — |
| bookings | `donorId` | `driveId` |
| alerts | `alertId` | — |
| hospitals | `hospitalId` | — |
| slots | `slotId` | — |
| slot-bookings | `donorId` | `slotId` |

## Conventions

- Each Lambda handler uses `@logger.inject_lambda_context` from `aws_lambda_powertools`
- HTTP responses always include `Access-Control-Allow-Origin: *`
- EventBridge invocations are detected via `event.get("source") == "eventbridge"`
- Frontend API calls go through `api.js:request()` which attaches the Cognito JWT automatically
- No prop-types validation in React components (pre-existing pattern — don't add it)
