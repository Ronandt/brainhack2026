# Bloodline

Singapore's blood supply crisis-resilience platform. Three modes: **Predict** (14-day shortage forecast), **Surge** (emergency geo-tiered donor alerts), **Retain** (donor engagement and gamification), **Schedule** (appointment booking).

---

## Quick Start — Frontend Only (no AWS account needed)

Use the shared deployed backend. Useful for UI development and demos.

### 1. Install Node.js

Download and install from https://nodejs.org (LTS version).

### 2. Clone and install

```bash
git clone <repo-url>
cd bloodline/frontend
npm install
```

### 3. Create `.env.local`

Create the file `bloodline/frontend/.env.local` with these values:

```env
VITE_API_URL=https://xxxxxxxxxx.execute-api.ap-southeast-1.amazonaws.com/dev
VITE_COGNITO_USER_POOL_ID=ap-southeast-1_1WQYdZjK2
VITE_COGNITO_CLIENT_ID=1p55vgc8u9bqounn6sj21rdpd7
VITE_REGION=ap-southeast-1
```

> Replace `VITE_API_URL` with the actual deployed API URL once known. The Cognito values above are shared and ready to use.

### 4. Run (local)

```bash
npm run dev
```

Open http://localhost:5173 in your browser.

---

## Full Deploy — Backend + Frontend to AWS

### Prerequisites

#### 1. Install AWS CLI

Download from https://aws.amazon.com/cli/ and run the installer.

Verify:
```powershell
aws --version
```

#### 2. Install AWS SAM CLI

Download from https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html and run the installer.

Verify:
```powershell
sam --version
```

#### 3. Configure AWS credentials

Go to [AWS Console](https://console.aws.amazon.com) → top-right account menu → **Security credentials** → **Access keys** → **Create access key**.

Then run:
```powershell
aws configure
```

Enter when prompted:
```
AWS Access Key ID:     <your key>
AWS Secret Access Key: <your secret>
Default region name:   ap-southeast-1
Default output format: json
```

Verify it works:
```powershell
aws sts get-caller-identity
```

---

### Deploy everything (one command)

From the `bloodline/` folder:
```powershell
.\deploy.ps1
```

This will:
1. Build and deploy all AWS resources (Lambda, DynamoDB, Cognito, S3, CloudFront, SNS, EventBridge)
2. Build the React frontend
3. Upload it to S3
4. Invalidate the CloudFront cache

First deploy takes ~5 minutes. CloudFront may take another 5–15 minutes to fully propagate.

---

### Deploy backend only

```powershell
cd bloodline
sam build
sam deploy
```

### Deploy frontend only (after backend is up)

```powershell
cd bloodline/frontend
npm run build
aws s3 sync dist/ s3://<FrontendBucketName>/ --delete
```

Get `FrontendBucketName` from:
```powershell
aws cloudformation describe-stacks --stack-name bloodline-dev --query "Stacks[0].Outputs"
```

---

## Local Development (frontend + local Lambda)

Run Lambda functions locally while pointing the frontend at them — no redeployment needed on every change.



### 1. Start local APIs and other services

```powershell
cd bloodline
sam local start-api
```

Lambda runs at `http://127.0.0.1:3000`.

### 2. Set `.env.local`

```env
VITE_API_URL=http://127.0.0.1:3000
VITE_COGNITO_USER_POOL_ID=ap-southeast-1_1WQYdZjK2
VITE_COGNITO_CLIENT_ID=1p55vgc8u9bqounn6sj21rdpd7
VITE_REGION=ap-southeast-1
```

### 3. Start frontend

```powershell
cd bloodline/frontend
npm run dev
```

---

## Project Structure

```
bloodline/
├── template.yaml           # SAM template — all AWS resources
├── samconfig.toml          # SAM deploy config
├── deploy.ps1              # One-command full deploy script
├── requirements.txt        # Python dependencies for Lambda
├── src/
│   ├── predict/            # 14-day shortage forecast
│   ├── surge/              # Break-glass surge alert activation
│   ├── notify/             # SNS push notification dispatcher
│   ├── donors/             # Donor profile CRUD + eligibility
│   ├── schedule/           # Blood drive listing + booking
│   ├── retain/             # Impact stats, badges, streaks
│   └── hsa-sync/           # Periodic HSA blood stock sync
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── auth.js         # Cognito sign in/up/out helpers
│   │   ├── api.js          # Authenticated API fetch wrapper
│   │   └── components/
│   │       ├── Auth.jsx
│   │       ├── Dashboard.jsx
│   │       ├── PredictPanel.jsx
│   │       ├── SurgePanel.jsx
│   │       ├── SchedulePanel.jsx
│   │       ├── RetainPanel.jsx
│   │       └── DonorPanel.jsx
│   └── .env.example        # Copy to .env.local and fill in values
└── events/                 # Local test payloads for sam local invoke
```

## API Endpoints

All routes require a Cognito JWT in the `Authorization` header except where noted.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/predict/status` | National blood status (ok/low/urgent/critical) |
| GET | `/api/v1/predict/forecast` | 14-day forecast, optional `?bloodType=O+` |
| GET | `/api/v1/donors/me` | Donor profile + eligibility countdown |
| PUT | `/api/v1/donors/me` | Update donor profile |
| POST | `/api/v1/surge/activate` | Activate surge alert (HSA admin only) |
| GET | `/api/v1/surge/monitor` | Live alert monitoring |
| GET | `/api/v1/schedule/drives` | List upcoming blood drives |
| POST | `/api/v1/schedule/book` | Book a slot |
| GET | `/api/v1/retain/stats` | Impact stats, badge tier, streak |

## Creating an HSA Admin Account

After deploying, promote a user to admin via CLI:

```powershell
# Create user
aws cognito-idp admin-create-user `
  --user-pool-id ap-southeast-1_1WQYdZjK2 `
  --username admin@hsa.gov.sg `
  --temporary-password "Bloodline2026!"

# Add to admin group
aws cognito-idp admin-add-user-to-group `
  --user-pool-id ap-southeast-1_1WQYdZjK2 `
  --username admin@hsa.gov.sg `
  --group-name HSAAdmin
```
