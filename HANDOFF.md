# BloodLine — Project Handoff

> **Last updated:** 2026-06-08
> **Updated by:** Claude (Sonnet 4.6) — auto-updated on every code change

---

## High-Level Goals

BloodLine is Singapore's national blood supply crisis-resilience platform, built for **Brainhack 2026**. The core thesis: no existing system anticipates shortages, mobilises donors in emergencies, or retains donors long-term.

**Three core modes:**
- **Predict** — 14-day seasonality-based shortage forecast per blood type; anchored to live Red Cross SG data; per-blood-type risk thresholds
- **Surge** — Break-glass emergency geo-tiered donor alerts (5km → 15km → island-wide), dual HSA director sign-off required, multi-channel (push + SMS); End Surge button
- **Retain** — Impact cards, lifetime stats, HSA milestone badges (Bronze 10 → Silver 25 → Gold 50 → Honorary 100), squads, streaks
- **Schedule** — 3-step booking flow (slot-based), Book tab (consolidated drives + bloodbank slots), Squad RSVP, 5km geolocation filter

**Three user roles** (detected from Cognito JWT group):
| Role | Group | Dashboard |
|------|-------|-----------|
| Donor | *(default)* | Light theme, mobile-first, bottom tab bar |
| HSA Admin | `HSAAdmin` | Dark sidebar console, data-dense |
| Hospital Staff | `HospitalStaff` | Dark sidebar, blue accent |

---

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite, inline styles, no CSS files |
| Design tokens | `BL` object in `tokens.js` — IBM Plex Sans/Mono |
| Auth | AWS Cognito (User Pool + hosted UI) |
| API | AWS API Gateway (REST) + Lambda (Python 3.13, `aws_lambda_powertools`) |
| Database | DynamoDB |
| Notifications | SNS → NotifyFunction → push/SMS |
| Scheduled jobs | EventBridge → hsa-sync Lambda (15 min), predict Lambda (hourly) |
| Region | `ap-southeast-1` |
| API base URL | `https://3lnyz8rj83.execute-api.ap-southeast-1.amazonaws.com/dev` |

---

## Repository Layout

```
brainhack2026/
├── bloodline/
│   ├── template.yaml                   # AWS SAM — all infra defined here
│   ├── frontend/
│   │   └── src/
│   │       ├── tokens.js               # BL design token object (single source of truth)
│   │       ├── api.js                  # All API calls (no logic, just fetch wrappers)
│   │       ├── auth.js                 # Cognito sign-in / sign-up / getToken
│   │       ├── config.js               # API_URL, Cognito pool/client IDs
│   │       └── components/
│   │           ├── Dashboard.jsx       # Role detection + all layout shells
│   │           ├── HomePanel.jsx       # Donor home + booking flow + surge banner + rally friends
│   │           ├── ImpactPanel.jsx     # Donor impact / retain stats
│   │           ├── DonorDrivesPanel.jsx# "Book" tab — consolidated drives+slots, Squad RSVP
│   │           ├── DonorPanel.jsx      # Donor profile / streak / squads
│   │           ├── Auth.jsx            # Login/signup — desktop split-panel, mobile native
│   │           ├── admin/
│   │           │   ├── OverviewPanel.jsx   # Forecast + stock grid + SVG line chart + heatmap
│   │           │   ├── SurgePanel.jsx      # Surge activation + End Surge button
│   │           │   ├── DonorsPanel.jsx     # Donor pool segmentation + retention campaigns
│   │           │   ├── DrivesPanel.jsx     # Drive approval queue
│   │           │   ├── DemandPanel.jsx     # Hospital demand signal submission
│   │           │   └── AdminProfilePanel.jsx # HSA admin profile (name, dept, contact)
│   │           └── hospital/
│   │               ├── MySlotsPanel.jsx    # Hospital: view submitted slots
│   │               ├── CreateSlotPanel.jsx # Hospital: submit new demand slot
│   │               ├── CheckinPanel.jsx    # QR scanner + donor check-in + donation recording
│   │               └── SetupLocationPanel.jsx # Hospital: first-time location setup
│   └── src/
│       ├── predict/handler.py          # GET /status, GET /forecast — seasonality model (Red Cross anchored)
│       ├── surge/handler.py            # POST /activate, POST /{id}/end, GET /monitor
│       ├── notify/handler.py           # SNS subscriber — dispatches push/SMS
│       ├── donors/handler.py           # GET/PUT /donors/me — donor CRUD + eligibility
│       ├── schedule/handler.py         # GET /drives, /slots, /bookings; POST /book, /slots/{id}/book
│       ├── retain/handler.py           # GET /retain/stats — impact, badges, streaks
│       ├── hsa-sync/handler.py         # EventBridge cron — scrapes Red Cross SG every 15 min
│       ├── admin/handler.py            # Admin endpoints — stock, alerts, segments, demand, donor lookup
│       ├── hospital/handler.py         # Hospital profile, slot creation, drive submission
│       └── diagnostics/handler.py      # Health checks, invoke scheduled functions manually
└── prototype/
    ├── wireframe-tokens.jsx
    ├── donor-screens.jsx
    ├── hsa-screens.jsx
    └── hospital-screens.jsx
```

---

## Features Implemented

### Donor Dashboard (mobile-first)

- **Responsive layout** — `useIsMobile()` hook at 768px breakpoint
  - Desktop: 180px white left sidebar (logo + nav + sign-out)
  - Mobile: no top bar, bottom tab bar (56px fixed), safe area inset top
- **Tab bar** — Home / Book / Impact / You

**HomePanel** (`HomePanel.jsx`):
- Fetches donor profile, national status, nearby slots in parallel on load
- **Live surge banner** — polls `GET /surge/monitor` every 30s; shows red break-glass card when:
  - Active surge for donor's exact blood type, OR
  - Any active island-wide surge (national emergency visible to all)
  - Hidden if donor already has a confirmed booking or has snoozed (2h)
- **3-step booking flow**: slot picker → confirm (eligibility quick-check list) → success screen; uses `bookSlot()` → `slot_bookings_table`
- **Eligibility gate**: ineligible donors (last donation < 60 days) see "Rally friends" instead of booking button
  - Rally friends button uses `navigator.share()` (native share sheet on iOS/Android) with pre-written message + `<link>` placeholder
- **Blood type grid**: sourced from live Red Cross SG scrape (`bloodStock`), uses `statusToNeed` mapping — consistent with HSA portal
- **QR check-in screen**: donor's QR code is their Cognito `sub` decoded from JWT (reliable even before profile loads); "I have arrived →" button
- **Booked screen**: shows upcoming booking details pulled from `getMyBookings()` (combines drive + slot bookings)

**Book tab** (`DonorDrivesPanel.jsx`):
- **Unified view** — fetches both `getDrives()` and `getSlots()` in parallel, merges and sorts by date
- **Type badges**: orange **DRIVE** (community/Red Cross organised) · blue **BLOODBANK** (hospital-posted slots)
- **Filters**: All · Within 5 km (uses `navigator.geolocation` + Haversine distance, filters items with `lat`/`lng`)
- **No blood type chips** — drives accept all types
- **RSVP** routes to correct API (`createBooking` for drives, `bookSlot` for slots)
- **Squad RSVP** button — bottom sheet with pre-written squad invite message; `navigator.share()` on mobile, clipboard fallback on desktop
- **Host a Drive** CTA — 3-step modal (select group → pick time → review invite) to organise a community drive

**ImpactPanel** (`ImpactPanel.jsx`):
- Fetches retain stats (donations, patients reached, volume, badge tier, streak, annual history)
- Annual donation bar chart, HSA milestone progress (Bronze/Silver/Gold/Honorary), badge display

**DonorPanel** (`DonorPanel.jsx`):
- Editable name / blood type / postal code (calls `PUT /donors/me`)
- Streak visual, donation stats grid
- Sign-out button (mobile only)

**Auth** (`Auth.jsx`):
- **Desktop**: dark left branding panel (tagline, feature bullets, blood type grid) + light right form panel
- **Mobile**: native app layout — logo at top, fields in middle, action button anchored near bottom with safe-area padding
- **Sign-up captures**: full name, email, password, blood type (chip selector), postal code
- **After email verification**: auto sign-in → immediately calls `PUT /donors/me` with `{name, bloodType, postalCode}` so profile is pre-populated on first load

### HSA Admin Dashboard (desktop console)

**Layout** (`Dashboard.jsx` → `AdminDashboard`):
- 200px dark sidebar (`#1a1917`), BloodLine logo, nav items with red left border active state
- **Top-right profile button**: shows real name + initials from `getDonor()`, clickable to navigate to profile panel (not in sidebar nav)

**OverviewPanel** — Forecast tab:
- Full-bleed two-column layout (content + 300px right rail)
- 4 KPI cards (types at risk, active surges, national status, total alerts) — all from live Red Cross data
- 8-type stock grid tinted by risk — sourced from Red Cross SG scrape (not DynamoDB units)
- **14-day projected stock chart** (pure SVG, no library):
  - 8 colour-coded lines, one per blood type
  - Hover legend buttons OR hover lines to isolate a type
  - Type-specific risk zone backgrounds appear on hover (AB- needs ≥88% to be "ok"; A+ only needs ≥55%)
  - Threshold lines and zone labels ("OK", "LOW", "URGENT", "CRITICAL") at zone midpoints
- **14-day shortage heatmap**:
  - 8 rows × 14 columns, each cell coloured by risk level with projected %
  - Isolates the hovered row when a type is hovered in the chart above (shared `hovered` state)
- Right rail: recommended actions, model confidence table (describes method + refresh cadence), blood bank capacity mini-bars

**SurgePanel** — Surge Mode tab:
- Blood type selector: 8 clickable chips
- Geo tier: 3 visual cards (5km / 15km / island-wide)
- Surge message preview + freetext override
- Second approver ID field (backend enforces dual sign-off)
- Break-glass activate button
- **Live alert monitor**: each active alert now has an **End** button → `POST /api/v1/surge/{alertId}/end` (HSA admin only)

**DonorsPanel, DrivesPanel, DemandPanel** — unchanged from original

**AdminProfilePanel** — My Profile (accessible via top-right header button):
- Editable: full name, department, contact/extension → saved to DynamoDB via `PUT /donors/me`
- Read-only: email (from JWT), staff ID (Cognito sub), role, access level
- Avatar with initials

### Hospital Dashboard

- `MySlotsPanel` — lists submitted hospital demand slots
- `CreateSlotPanel` — form to create new demand slot (goes live immediately as `status: "upcoming"`)
- `CheckinPanel` — QR code scanner (html5-qrcode) + manual donor ID lookup + blood draw recording
  - Uses `lookupDonor(donorId)` → `GET /api/v1/hospital/donor`
  - Records donation via `recordDonation()` → `POST /api/v1/admin/donations`
  - Double-stop bug fixed (firedRef guard prevents uncaught error on scanner unmount)
- `SetupLocationPanel` — hospital staff set their location on first login

---

## Forecast Model (`predict/handler.py`)

Replaced random walk heuristic with a deterministic seasonality model:

- **Anchor**: current Red Cross SG percentage (scraped every 15 min, stored in DynamoDB)
- **Per-blood-type net daily change** (calibrated from SG demographics):
  - O-: −1.2%/day (universal donor, 6% of population → fastest depletion)
  - O+: −0.4%/day
  - B+: +0.05%/day (well-balanced supply/demand)
  - AB-: −0.45%/day
- **Day-of-week donation multipliers** (Singapore pattern): Mon 0.78× → Sat 1.20×, Sun 1.28×
- **Singapore 2026 public holiday suppression**: 0.68× on holiday, 0.82× day before
- **Campaign boost**: when % < 50% → 1.18×; when % < 30% → 1.45× (Red Cross activates appeals)
- **Mean-reversion damping**: each type has an equilibrium %, pulled toward it at 4%/day
- **Per-blood-type risk thresholds** (not global): A+ ok ≥ 55%, AB- ok ≥ 88% — calibrated from observed Red Cross status vs percentage
- `/status` reads directly from blood_stock_table (live Red Cross data, not forecast)
- `/forecast` reads from predictions_table (model output, refreshed hourly via EventBridge)

---

## Blood Stock Scraping (`hsa-sync/handler.py`)

Scrapes `https://redcross.sg/` every 15 minutes:
- Parses `.blood-grp-img` blocks (blood type from `h3`, status from `h5`)
- **Extracts percentage from an HTML comment** `<!-- 79 -->` inside `.blood-grp-hover` — Red Cross embeds this for their SVG animation; we read it with BeautifulSoup's `Comment` node type
- Falls back to `STATUS_FALLBACK` dict if comment is missing
- Writes to DynamoDB `BloodStockTable` (PK: `bloodType`, SK: `updatedAt`)
- Reads with `query(ScanIndexForward=False, Limit=1)` — table has composite key (HASH + RANGE)

---

## Surge Mode: End-to-End Flow

```
HSA Admin fills blood type + geo tier + approver ID
    → clicks "Activate Surge Mode →"
    → POST /api/v1/surge/activate (HSA Cognito group required)
    → DynamoDB writes alert {status: "active", bloodType, geoTier, ...}
    → SNS publishes → NotifyFunction sends push/SMS to eligible donors

Donor app polls GET /api/v1/surge/monitor every 30s
    → returns { activeAlerts: [...] }
    → filter: show if bloodType matches donor OR geoTier === "island-wide"
    → red surge banner renders on HomePanel; ineligible donors see "rally friends" instead of booking
    → when alert ends (POST /api/v1/surge/{alertId}/end), banner disappears on next poll
```

---

## API Routes (full list)

| Method | Path | Handler | Notes |
|--------|------|---------|-------|
| GET | `/api/v1/donors/me` | donors | Donor profile + eligibility |
| PUT | `/api/v1/donors/me` | donors | Update name, bloodType, postalCode, department, phone |
| GET | `/api/v1/predict/status` | predict | Current live risk per blood type (from Red Cross) |
| GET | `/api/v1/predict/forecast` | predict | 14-day model output |
| POST | `/api/v1/surge/activate` | surge | HSA admin only; dual sign-off |
| POST | `/api/v1/surge/{alertId}/end` | surge | HSA admin only; ends active alert |
| GET | `/api/v1/surge/monitor` | surge | All logged-in users; polls active alerts |
| GET | `/api/v1/schedule/drives` | schedule | All upcoming drives |
| POST | `/api/v1/schedule/drives` | schedule | Create a blood drive |
| POST | `/api/v1/schedule/book` | schedule | Book a drive slot |
| GET | `/api/v1/schedule/bookings` | schedule | My bookings (drives + slots combined) |
| GET | `/api/v1/slots` | schedule | All available donation slots |
| POST | `/api/v1/slots/{slotId}/book` | schedule | Book a specific slot |
| GET | `/api/v1/hospital/drives` | schedule | Drives created by this hospital user |
| GET | `/api/v1/blood-stock` | hsa-sync | Latest Red Cross SG blood stock |
| GET | `/api/v1/retain/stats` | retain | Donor impact, badges, streak |
| GET | `/api/v1/admin/donors/segments` | admin | Donor pool segmentation |
| GET | `/api/v1/admin/drives/pending` | admin | Pending drive approvals |
| POST | `/api/v1/admin/drives/{id}/approve` | admin | Approve a drive |
| POST | `/api/v1/admin/drives/{id}/reject` | admin | Reject a drive |
| GET | `/api/v1/admin/stock` | admin | Blood stock overview |
| GET | `/api/v1/admin/alerts` | admin | All surge alerts |
| POST | `/api/v1/admin/demand` | admin | Submit hospital demand signal |
| POST | `/api/v1/admin/donations` | admin | Record completed donation |
| GET | `/api/v1/hospital/donor` | admin | Look up donor by ID (hospital check-in) |
| GET/PUT | `/api/v1/hospital/profile` | hospital | Hospital profile |
| GET/POST | `/api/v1/hospital/slots` | hospital | Hospital's posted slots |
| GET | `/api/v1/hospitals` | hospital | List all hospitals |
| GET | `/api/v1/admin/diagnostics` | diagnostics | Health checks |
| POST | `/api/v1/admin/trigger` | diagnostics | Manually invoke scheduled functions |

---

## DynamoDB Tables

All tables use `PAY_PER_REQUEST` billing.

| Table | PK | SK | Notes |
|-------|----|----|-------|
| donors | `donorId` | — | Stores name, bloodType, postalCode, department, phone, eligibility |
| donations | `donorId` | `donatedAt` | Donation history |
| predictions | `bloodType` | `forecastDate` | 14-day forecast output; TTL 16 days |
| blood-stock | `bloodType` | `updatedAt` | Red Cross scrape history; **manually managed** (not CF) |
| drives | `driveId` | — | Blood drives |
| bookings | `donorId` | `driveId` | Drive bookings |
| alerts | `alertId` | — | Surge alerts |
| hospitals | `hospitalId` | — | Hospital profiles |
| slots | `slotId` | — | Hospital-posted donation time slots |
| slot-bookings | `donorId` | `slotId` | Slot bookings |

> **Note:** `bloodline-blood-stock-dev` is **not managed by CloudFormation** — it was extracted due to a schema conflict during the CF update cycle. It must be manually recreated if deleted. Schema: `bloodType` (HASH) + `updatedAt` (RANGE).

---

## Design System

All tokens in `tokens.js` as the `BL` object:

| Token | Value | Usage |
|-------|-------|-------|
| `BL.paper` | `#fafaf9` | Page background |
| `BL.card` | `#ffffff` | Card surfaces |
| `BL.ink` | `#1a1917` | Primary text + filled elements |
| `BL.red` | `#b83a33` | Logo mark, active nav border |
| `BL.surge` | `#d62828` | Surge mode ONLY |
| `BL.surgeBg` | `#fdecec` | Surge card backgrounds |
| `BL.hair` | `#e7e4dd` | Borders |
| `BL.fill` | `#f1ede5` | Subtle backgrounds |
| `BL.muted` | `#6b6862` | Secondary text |
| `BL.need.ok/low/urgent/critical` | fg + bg pairs | Risk tinting |

---

## Infrastructure Notes

### CloudFormation Stack (`bloodline-dev`)

- Stack is in `UPDATE_ROLLBACK_COMPLETE` state — a full `sam deploy` is still pending
- **Lambdas directly updated** via `aws lambda update-function-code` (bypassing CF) for speed:
  - `bloodline-donors-dev` — datetime timezone fix, json serialisation fix, department/phone fields
  - `bloodline-admin-dev` — datetime timezone fix
  - `bloodline-predict-dev` — complete new forecast model
- **Pending full deploy** will apply:
  - GatewayResponse resources (CORS on 4xx/5xx responses)
  - EndSurge route (`POST /api/v1/surge/{alertId}/end`)
  - ListMyBookings route (`GET /api/v1/schedule/bookings`)
  - ListSlots + BookSlot routes (`GET /api/v1/slots`, `POST /api/v1/slots/{slotId}/book`)
  - HospitalFunction (new Lambda for hospital profile/slots)
  - DiagnosticsFunction

### Python 3.13

SAM build requires Python 3.13. Install via:
```bash
brew install python@3.13
```
Then verify: `python3.13 --version`

---

## Known Issues / Current State

| Issue | Status |
|-------|--------|
| Full `sam deploy` not yet completed | Stack in `UPDATE_ROLLBACK_COMPLETE`; Lambdas manually patched |
| CORS on 4xx errors (Cognito auth rejection) | Template fix ready (GatewayResponse); needs deploy to take effect |
| Drive "Ask edits" button | Does nothing; no backend endpoint |
| Retention campaigns in DonorsPanel | Static/illustrative |
| Blood type mix chart in DonorsPanel | Hardcoded SG population percentages |
| Surge banner console.log | Intentional debug log; remove before demo |
| Blood bank capacity in SurgePanel | Hardcoded; no API |
| Squads | DonorPanel shows empty state; no squads API; Squad RSVP in Book tab uses share sheet only |
| `bloodline-blood-stock-dev` table | Manually managed; not in CF stack |

---

## Data Seeding (Needed for Demo)

- [ ] Seed blood drives + hospital slots into DynamoDB (Book tab currently empty without seeding)
- [ ] Seed donation history for demo donor account (~15 donations) so Impact tab looks realistic
- [ ] Verify donor profile records have `bloodType` set (surge banner requires this for non-island-wide surges)

---

## Team

| Person | Role |
|--------|------|
| Declan | Backend / infra (Lambda, DynamoDB, SAM) |
| Ezekiel | Full-stack / data (seeding, integration testing, frontend) |
| Bryan | Frontend / UI |
| Zach | Frontend / demo prep |
