# BloodLine — Project Handoff

> **Last updated:** 2026-06-04
> **Updated by:** Claude (Sonnet 4.6) — auto-updated on every code change

---

## High-Level Goals

BloodLine is Singapore's national blood supply crisis-resilience platform, built for **Brainhack 2026**. The core thesis: no existing system anticipates shortages, mobilises donors in emergencies, or retains donors long-term.

**Three core modes:**
- **Predict** — 14-day Bayesian shortage forecast per blood type; regional risk map; national need indicator (ok / low / urgent / critical)
- **Surge** — Break-glass emergency geo-tiered donor alerts (5km → 15km → island-wide), dual HSA director sign-off required, multi-channel (push + SMS)
- **Retain** — Impact cards, lifetime stats, HSA milestone badges (Bronze 10 → Silver 25 → Gold 50 → Honorary 100), squads, streaks
- **Schedule** — 3-step booking flow, blood drives near you, community drive approval queue

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
| API | AWS API Gateway (REST) + Lambda (Python, `aws_lambda_powertools`) |
| Database | DynamoDB |
| Notifications | SNS → NotifyFunction → push/SMS |
| Scheduled jobs | EventBridge → hsa-sync Lambda |
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
│   │           ├── HomePanel.jsx       # Donor home + booking flow + surge banner
│   │           ├── ImpactPanel.jsx     # Donor impact / retain stats
│   │           ├── DonorDrivesPanel.jsx# Donor drives list + quick RSVP
│   │           ├── DonorPanel.jsx      # Donor profile / streak / squads
│   │           ├── admin/
│   │           │   ├── OverviewPanel.jsx   # HSA forecast + stock grid + right rail
│   │           │   ├── SurgePanel.jsx      # Surge activation (blood chips, break-glass)
│   │           │   ├── DonorsPanel.jsx     # Donor pool segmentation + retention campaigns
│   │           │   ├── DrivesPanel.jsx     # Drive approval queue (2-col card grid)
│   │           │   └── DemandPanel.jsx     # Hospital demand signal submission
│   │           └── hospital/
│   │               ├── MySlotsPanel.jsx    # Hospital: view submitted slots
│   │               └── CreateSlotPanel.jsx # Hospital: submit new demand slot
│   └── src/
│       ├── predict/handler.py          # GET /status, GET /forecast — heuristic model
│       ├── surge/handler.py            # POST /activate (HSA only), GET /monitor (all)
│       ├── notify/handler.py           # SNS subscriber — dispatches push/SMS
│       ├── donors/handler.py           # GET/PUT /donors/me — donor CRUD + eligibility
│       ├── schedule/handler.py         # GET /drives, POST /book
│       ├── retain/handler.py           # GET /retain/stats — impact, badges, streaks
│       ├── hsa-sync/handler.py         # EventBridge cron — syncs blood stock
│       └── admin/handler.py            # Admin endpoints — stock, alerts, segments, demand
└── prototype/
    ├── wireframe-tokens.jsx            # Design system primitives (W, Tag, Btn, BloodChip)
    ├── donor-screens.jsx               # Donor app prototype screens
    ├── hsa-screens.jsx                 # HSA console prototype screens
    └── hospital-screens.jsx            # Hospital portal prototype screens
```

---

## Features Implemented

### Donor Dashboard (mobile-first)

- **Responsive layout** — `useIsMobile()` hook at 768px breakpoint
  - Desktop: 180px white left sidebar (logo + nav + sign-out)
  - Mobile: no top bar, bottom tab bar (56px fixed), safe area inset top
- **Tab bar** — Home / Drives / Impact / You; square `TabIcon` (22×22, borderRadius 5)
- **AppHeader pattern** — mono 9px sub-label + 22px 600-weight title + optional right element; used in every panel

**HomePanel** (`HomePanel.jsx`):
- Fetches donor profile, national status, nearby drives in parallel on load
- **Live surge banner** — polls `GET /surge/monitor` every 30s; shows red break-glass card when:
  - Active surge for donor's exact blood type, OR
  - Any active island-wide surge (national emergency visible to all)
- 3-step booking flow: slot picker → confirm (quick-check list) → success screen
- Eligibility card (shows days until next eligible), national need hero card, blood type grid (8 types, tinted by risk), nearest drives

**ImpactPanel** (`ImpactPanel.jsx`):
- Fetches retain stats (donations, patients reached, volume, badge tier, streak, annual history)
- Streak pill badge in AppHeader right slot
- Annual donation bar chart, HSA milestone progress (Bronze/Silver/Gold/Honorary), badge display

**DonorDrivesPanel** (`DonorDrivesPanel.jsx`):
- Blood type filter chips, capacity progress bar per drive, RSVP button with optimistic state

**DonorPanel** (`DonorPanel.jsx`):
- Fetches donor profile + retain stats (for streak)
- Editable name / blood type / postal code (calls `PUT /donors/me`)
- Streak visual: 8-block bar filled proportionally
- Squads empty state (no API yet)
- Donation stats grid (total, badge, last donated)
- Sign-out button (mobile only — desktop sign-out is in the sidebar)

### HSA Admin Dashboard (desktop console)

Layout (`Dashboard.jsx` → `AdminDashboard`):
- 200px dark sidebar (`#1a1917`), BloodLine logo, nav items with red left border active state
- Bottom status block: `MODE · PREDICT / OPS · GREEN · 3 ACTIVE`
- Top header: breadcrumb + datetime + "Dr. R. Lim · HSA" + avatar circle

**OverviewPanel** — Forecast tab:
- Full-bleed two-column layout (content + 300px right rail)
- 4 KPI cards (types at risk, active surges, national status, total alerts) — live data
- 8-type stock grid with tinted cells (colour = risk level) — live data
- Right rail: recommended actions (built from live alert data), model confidence table, blood bank capacity mini-bars

**SurgePanel** — Surge Mode tab:
- Blood type selector: 8 clickable chips (not a select dropdown)
- Geo tier: 3 visual checkbox-style cards (5km / 15km / island-wide)
- Channel display (Push ✓, SMS ✓, WhatsApp, Email)
- Surge message preview + freetext override
- Second approver ID field (backend enforces dual sign-off)
- Right column: projected reach numbers (estimated per tier), blood bank capacity check, break-glass button with `BL.surge` 2px red border
- Live alert monitor (last 3 active alerts with notified/responses/bookings counts)

**DonorsPanel** — Donor pool tab:
- 4 KPI funnel cards (Active / Dormant / At-risk / Lapsed) with tone-coloured backgrounds — live data
- Segment donor table with filter tabs — live data from `GET /admin/donors/segments`
- Blood type mix bar chart (static proportions, illustrative)
- Retention campaigns table (static, illustrative)

**DrivesPanel** — Drive queue tab:
- 2-column card grid; each card: REQUEST #, org, WHEN/POOL row, FORECAST FIT box
- Decline / Ask edits / Approve action buttons — live calls to approve/reject Lambda
- Cards removed from list on action (optimistic)

**DemandPanel** — Hospital demand tab:
- Form: hospital select, blood type, procedure count, date
- Submits to `POST /admin/demand` → feeds into forecast model
- Session submissions log

### Hospital Dashboard

- `MySlotsPanel` — lists submitted hospital demand slots
- `CreateSlotPanel` — form to create new demand slot

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
    → red surge banner renders on HomePanel with HSA message + "Book a slot now →" CTA
    → when alert status changes from "active", banner disappears on next poll
```

**Auth note:** `GET /surge/monitor` uses the default Cognito authorizer (all logged-in users). `POST /surge/activate` additionally checks `HSAAdmin` Cognito group in the Lambda handler.

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

Prototype reference: `prototype/wireframe-tokens.jsx` — `W` card (borderRadius 6), `Tag` (mono 9px, letterSpacing 0.6), `Btn` (sm=28/md=36/lg=44), `BloodChip` (sm/md/lg/xl).

---

## Failed Approaches / Known Issues

| Issue | What happened | Current state |
|-------|--------------|---------------|
| Claude Design URL | `https://api.anthropic.com/v1/design/...` returned binary gzip, unreadable | Worked around using `prototype/*.jsx` files directly |
| Mobile top bar | Initially kept a sticky "BLOODLINE" brand bar on mobile (36px) | Removed — mobile has no top bar; safe area via `max(16px, env(safe-area-inset-top))` container padding |
| Surge banner not showing | `getSurgeMonitor` errors were silently swallowed; filter `(userType === "O-" && island-wide)` was backwards | Fixed: errors now `console.error`; island-wide surges show to ALL donors |
| `onLogout` not reaching DonorPanel | Sign-out was in mobile top bar, Panel had no prop | Threaded `onLogout` through `PanelContent` → `DonorPanel`; desktop sign-out stays in sidebar |
| OverviewPanel right rail | Needed full-bleed two-column layout but content wrapper had `padding: 24` | Used negative margin hack (`margin: "-20px -24px"`) + explicit height to break out of the wrapper |
| Predict model | Backend uses random heuristic | Noted as `# Heuristic forecast — replace with SageMaker endpoint call post-hackathon` in `predict/handler.py` |
| `POST /schedule/drives` missing | `createDrive()` in api.js pointed to a non-existent route; `CreateSlotPanel` in hospital portal was getting 404s | Added handler in `schedule/handler.py` + `CreateDrive` event in `template.yaml`. **Requires `sam deploy` to take effect.** |
| `GET /hospital/drives` 403 (CORS preflight fail) | Route never existed in SAM template → API Gateway 403 on unknown routes kills CORS preflight | **Temp fix:** `MySlotsPanel` now uses `getDrives()` (shows all drives). Proper fix (filter by hospital user) added to `schedule/handler.py` + `template.yaml` — swap `MySlotsPanel` back to `getHospitalDrives()` after `sam deploy`. |
| Donor profile page blank | `bloodline-donors-dev` table is empty → `getDonor()` 404 → `Promise.allSettled` swallows it → `donor` stays null → blank render | `DonorPanel` now catches 404 and shows initial setup form. First save uses `updateDonor` (DynamoDB `update_item` upserts) to create the record. Blood type set once at setup, immutable after. |
| `GET /schedule/bookings` missing | No endpoint to fetch a donor's own bookings — home screen used localStorage (wrong source of truth) | Added `_list_my_bookings` to `schedule/handler.py` + route in `template.yaml`. Queries `bloodline-bookings-dev` by donorId, enriches with drive details, filters to upcoming only. **Requires `sam deploy`.** |

---

## Current Open Issues / Bugs

1. **Surge: blood bank capacity is hardcoded** — `SurgePanel.jsx` shows static blood bank fill bars. No API exists to fetch real capacity.
2. **Donor squads** — `DonorPanel.jsx` shows a static empty state. No squads API exists yet.
3. **Drive "Ask edits"** button in `DrivesPanel.jsx` does nothing (no backend endpoint for edit requests).
4. **Retention campaigns** in `DonorsPanel.jsx` are static/illustrative — no campaigns API.
5. **Blood type mix chart** in `DonorsPanel.jsx` uses hardcoded Singapore population percentages.
6. **Surge banner console.log** — `[Surge] active alerts: [...]` is intentionally left in for debugging. Remove before demo if noisy.
7. **Hospital dashboard** — largely unmatched to prototype; `MySlotsPanel` and `CreateSlotPanel` are functional but not styled to the prototype.

---

## Data Seeding (Still Needed for Demo)

From the open task list:
- [ ] Seed blood drives into DynamoDB (so the drives list isn't empty)
- [ ] Seed donation history for the demo donor account (~15 donations) so Impact tab looks realistic
- [ ] Fix `eligible` boolean field in DynamoDB donor records (some records may be missing it)
- [ ] Update `README.md` — replace `xxxxxxxxxx` with actual API ID `3lnyz8rj83`

---

## Immediate Next Steps

### Priority 1 — Demo readiness
1. **Seed data** — drives + donation history (see above). Without this, HomePanel shows empty state and ImpactPanel shows zeroes.
2. **Test full surge flow end-to-end** — activate from HSA admin → confirm banner appears on donor screen within 30s. Check browser console for `[Surge]` log lines if it doesn't appear.
3. **Verify donor profile has blood type** — if `donor.bloodType` is null (unfilled profile), the surge banner may not render for non-island-wide surges. Either seed the field in DynamoDB or have the donor fill in their profile first.

### Priority 2 — Polish
4. **Hospital dashboard styling** — match `hospital-screens.jsx` prototype (same pattern as HSA admin work).
5. **Remove surge `console.log`** in `HomePanel.jsx` before demo.
6. **Fix Drive "Ask edits"** button or hide it.

### Priority 3 — Post-hackathon
7. Replace `predict/handler.py` heuristic with a real Bayesian / SageMaker model.
8. Wire SES email channel in `notify/handler.py` (currently only SNS/push is active).
9. Build squads API (`/donors/squads`) and wire it to `DonorPanel`.
10. Build campaigns API and wire it to `DonorsPanel`.

---

## Team

| Person | Role |
|--------|------|
| Declan | Backend / infra (Lambda, DynamoDB, SAM) |
| Ezekiel | Full-stack / data (seeding, integration testing, frontend) |
| Bryan | Frontend / UI |
| Zach | Frontend / demo prep |
