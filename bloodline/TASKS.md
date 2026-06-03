# Bloodline — Hackathon Task List

---

## Declan (Backend / Infra)

- [ ] **Auto-create donor profile on first sign-in** — `GET /donors/me` returns 404 for new users. Add a fallback in `src/donors/handler.py` that creates the profile from Cognito claims if it doesn't exist yet
- [ ] **Wire up SES email for surge alerts** — `src/notify/handler.py` currently stubs push delivery. Add `boto3 ses.send_email()` using the donor's email from DynamoDB; verify sender email in SES console first
- [ ] **Add SES send permission to NotifyFunction in `template.yaml`** — add `SESCrudPolicy` or inline `ses:SendEmail` IAM statement
- [ ] **Improve prediction model** — current heuristic in `src/predict/handler.py` is fully random. Make it use actual BloodStockTable values as baseline and apply realistic decay/recovery rates per blood type
- [ ] **Deploy and validate DiagnosticsFunction** — run `.\deploy.ps1`, open the 🔧 Test tab, hit Run Full Diagnostics, confirm all services show green
- [ ] **Create HSA admin account** — run the two `aws cognito-idp` commands in the README to set up the demo admin user
- [ ] **Trigger initial data population** — after deploy, use the Test panel to trigger HSA Sync + Predict Refresh so tables aren't empty at demo time

---

## Ezekiel (Full-stack / Data)

- [ ] **Seed blood drives into DynamoDB** — use `aws dynamodb put-item` or a seed script to add 4–5 realistic Singapore blood drives (SGH, NUH, Woodlands, Tampines) so SchedulePanel has real content
- [ ] **Seed donation history for demo account** — add ~15 donation records to `bloodline-donations-dev` for the demo donor ID so RetainPanel shows a real streak, badges, and history chart
- [ ] **Fix donor eligibility flag in DynamoDB** — `eligible` field needs to be set as a boolean when seeding donors; currently NotifyFunction filters on it but it may not exist in new records
- [ ] **Test the full surge flow end to end** — sign in as HSA admin → activate surge for O- → check AlertsTable in DynamoDB console → confirm NotifyFunction CloudWatch logs fired
- [ ] **Add `retain` handler to `src/` directory** — currently exists but double-check `template.yaml` has a `RetainFunction` entry (it does, verify after deploy)
- [ ] **Update README** with actual API URL** — replace `xxxxxxxxxx` in the Quick Start section with `3lnyz8rj83`

---

## Bryan (Frontend / UI)

- [ ] **Add PWA icons** — `public/manifest.json` references `icon-192.png` and `icon-512.png` which don't exist yet; create or drop in placeholder icons so the PWA installs correctly
- [ ] **Polish Predict heatmap** — PredictPanel shows a flat table; replace with a colour-coded grid (blood type × day) matching the wireframe heatmap design
- [ ] **Add loading skeleton states** — panels currently show plain "Loading…" text; replace with grey placeholder bars so the UI feels more polished during API calls
- [ ] **Add empty state illustrations** — SchedulePanel shows "No upcoming drives found" as plain text; add a simple message with a CTA to check back later
- [ ] **Test sign-up → verify → sign-in flow** on the deployed CloudFront URL and confirm the verification code screen works end to end
- [ ] **Test on mobile** — open the CloudFront URL on a phone, verify layout doesn't break on small screens (especially the surge panel and tab nav)

---

## Zach (Frontend / Demo prep)

- [ ] **Write the demo script** — 5-minute walkthrough: sign in as donor → check national status → view forecast → book a drive → sign in as HSA admin → activate surge alert → show live monitoring
- [ ] **Add a "Demo mode" seed button** to TestPanel that pre-populates a donor with realistic history and books a drive in one click — makes resetting the demo fast between judges
- [ ] **Test all 6 API endpoints** using the 🔧 Test tab → Test All Endpoints; screenshot or note any failures
- [ ] **Verify CloudFront URL loads correctly** after each deploy — hard refresh (`Ctrl+Shift+R`), confirm no console errors
- [ ] **Prepare fallback screenshots** — in case of network issues during judging, have screenshots of every panel with real data loaded
- [ ] **Check the README is accurate** — follow the Quick Start steps from scratch on a clean machine and note anything that doesn't work

---

## Shared / Blocked 

- [ ] Everyone: create an account on the CloudFront URL and verify sign-up email flow works
- [ ] Everyone: confirm the 🔧 Test panel shows all green after the next full deploy
