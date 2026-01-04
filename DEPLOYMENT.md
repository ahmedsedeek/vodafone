# Vodafone Cash Tracker - Production Deployment Guide

## ZERO-THINKING DEPLOYMENT CHECKLIST

Follow each step exactly. No decisions required.

---

## PHASE 1: Google Apps Script Setup

### Step 1.1: Create New Apps Script Project

1. Go to: https://script.google.com/
2. Click **"New project"**
3. Click **"Untitled project"** at top → Rename to: `Vodafone Cash Tracker API`
4. Delete all default code in `Code.gs`

### Step 1.2: Create Script Files

Create the following files by clicking **"+"** next to "Files" and selecting "Script":

| File Name | Source |
|-----------|--------|
| `Code.gs` | Copy from `apps-script/Code.gs` |
| `Database.gs` | Copy from `apps-script/Database.gs` |
| `Auth.gs` | Copy from `apps-script/Auth.gs` |
| `Wallets.gs` | Copy from `apps-script/Wallets.gs` |
| `Clients.gs` | Copy from `apps-script/Clients.gs` |
| `Transactions.gs` | Copy from `apps-script/Transactions.gs` |
| `Payments.gs` | Copy from `apps-script/Payments.gs` |
| `Reports.gs` | Copy from `apps-script/Reports.gs` |
| `Attachments.gs` | Copy from `apps-script/Attachments.gs` |
| `PDF.gs` | Copy from `apps-script/PDF.gs` |

### Step 1.3: Update Manifest

1. Click **Project Settings** (gear icon) in left sidebar
2. Check **"Show 'appsscript.json' manifest file in editor"**
3. Go back to Editor
4. Click `appsscript.json` in Files list
5. Replace entire contents with:

```json
{
  "timeZone": "Africa/Cairo",
  "dependencies": {},
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "webapp": {
    "executeAs": "USER_DEPLOYING",
    "access": "ANYONE"
  },
  "oauthScopes": [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive",
    "https://www.googleapis.com/auth/script.external_request"
  ]
}
```

6. Click **Save** (Ctrl+S)

### Step 1.4: Run Initial Setup

1. In Editor, select `Code.gs` from Files
2. In function dropdown (top bar), select `initialSetup`
3. Click **Run**
4. **AUTHORIZE WHEN PROMPTED:**
   - Click "Review permissions"
   - Select your Google account
   - Click "Advanced" → "Go to Vodafone Cash Tracker API (unsafe)"
   - Click "Allow"
5. Wait for execution to complete
6. Click **View** → **Logs** (or Ctrl+Enter)
7. **COPY AND SAVE** these values from logs:
   - Spreadsheet ID: `________________`
   - Spreadsheet URL: `________________`
   - Drive Folder ID: `________________`
   - API Key: `________________`

### Step 1.5: Set Admin Password

1. Click **Project Settings** (gear icon)
2. Scroll to **Script Properties**
3. Click **"Edit script properties"**
4. Find `ADMIN_PASSWORD` and click edit (pencil icon)
5. Change value from `CHANGE_THIS_PASSWORD` to your secure password
6. Click **Save script properties**

### Step 1.6: Deploy as Web App

1. Click **Deploy** → **New deployment**
2. Click gear icon next to "Select type" → Select **"Web app"**
3. Fill in:
   - Description: `Production v1.0`
   - Execute as: `Me`
   - Who has access: `Anyone`
4. Click **Deploy**
5. **AUTHORIZE AGAIN** if prompted (same steps as before)
6. **COPY AND SAVE** the Web App URL:
   - `https://script.google.com/macros/s/_______________/exec`

---

## PHASE 2: Verify Google Setup

### Step 2.1: Verify Spreadsheet

1. Open the Spreadsheet URL from Step 1.4
2. Confirm these sheets exist (Arabic names):
   - المحافظ (Wallets)
   - العملاء (Clients)
   - أرقام العملاء (Client Phones)
   - المعاملات (Transactions)
   - المدفوعات (Payments)
   - المرفقات (Attachments)
   - الجلسات (Sessions)
3. Confirm each sheet has Arabic headers in red

### Step 2.2: Verify Drive Folder

1. Go to: https://drive.google.com/
2. Search for: `Vodafone Cash Attachments`
3. Confirm folder exists (will be empty)

### Step 2.3: Test API

Open this URL in browser (replace with your values):
```
YOUR_WEB_APP_URL?path=dashboard&apiKey=YOUR_API_KEY
```

Expected response:
```json
{
  "success": true,
  "timestamp": "...",
  "data": {
    "todayProfit": 0,
    "todayVolume": 0,
    ...
  }
}
```

---

## PHASE 3: Frontend Deployment (Vercel)

### Step 3.1: Prepare Environment File

1. In project folder, copy `.env.production.example` to `.env.production`
2. Edit `.env.production` with your values:

```env
APPS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
APPS_SCRIPT_API_KEY=vck_YOUR_API_KEY_HERE
ADMIN_PASSWORD=YOUR_SECURE_PASSWORD
SESSION_SECRET=GENERATE_A_32_CHAR_HEX_STRING
NEXT_PUBLIC_APPS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
```

To generate SESSION_SECRET, run in terminal:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Step 3.2: Create Vercel Project

1. Go to: https://vercel.com/
2. Sign in with GitHub
3. Click **"Add New..."** → **"Project"**
4. Import your repository (or upload folder)
5. Configure:
   - Framework Preset: `Next.js`
   - Root Directory: `./`
   - Build Command: `npm run build`
   - Output Directory: `.next`

### Step 3.3: Add Environment Variables in Vercel

In Vercel project settings → **Environment Variables**, add:

| Name | Value |
|------|-------|
| `APPS_SCRIPT_URL` | Your Web App URL from Step 1.6 |
| `APPS_SCRIPT_API_KEY` | Your API Key from Step 1.4 |
| `ADMIN_PASSWORD` | Your admin password |
| `SESSION_SECRET` | Generated 32-char hex string |
| `NEXT_PUBLIC_APPS_SCRIPT_URL` | Same as APPS_SCRIPT_URL |

Click **Save** for each.

### Step 3.4: Deploy

1. Click **Deploy**
2. Wait for build to complete (~2-3 minutes)
3. Note your deployment URL: `https://your-project.vercel.app`

### Step 3.5: Update CORS in Apps Script (Optional but Recommended)

1. Go back to Apps Script Editor
2. Open `Code.gs`
3. Find line:
   ```javascript
   ALLOWED_ORIGINS: ['https://your-domain.vercel.app'],
   ```
4. Replace with your actual Vercel domain
5. Save and deploy a new version

---

## PHASE 4: Final Verification

### Step 4.1: Test Login

1. Open: `https://your-project.vercel.app/login`
2. Enter your admin password
3. Verify redirect to dashboard

### Step 4.2: Test Create Wallet

1. Go to Wallets page
2. Click "إضافة محفظة" (Add Wallet)
3. Enter:
   - Phone: `01012345678`
   - Name: `محفظة تجريبية`
   - Balance: `1000`
4. Submit
5. Verify wallet appears in list
6. Open Google Sheet → Verify row added in المحافظ sheet

### Step 4.3: Test Create Client

1. Go to Clients page
2. Click "إضافة عميل" (Add Client)
3. Enter:
   - Name: `عميل تجريبي`
   - Phone: `01098765432`
4. Submit
5. Verify client appears in list

### Step 4.4: Test Create Transaction

1. Go to Transactions page
2. Click "معاملة جديدة" (New Transaction)
3. Enter:
   - Wallet: Select test wallet
   - Client: Select test client
   - Type: `TRANSFER_OUT`
   - VC Amount: `100`
   - Cash Amount: `105`
4. Submit
5. Verify transaction appears
6. Verify client debt updated

### Step 4.5: Test Payment

1. Go to Payments page
2. Click "تسجيل دفعة" (Record Payment)
3. Select test client
4. Enter amount: `105`
5. Submit
6. Verify client debt becomes 0

### Step 4.6: Test PDF Statement

1. Go to Clients page
2. Click test client
3. Click "تحميل كشف حساب" (Download Statement)
4. Verify PDF downloads with correct data

---

## TROUBLESHOOTING

### "Invalid API key" Error
- Verify API_KEY in Vercel matches Script Properties
- Check for extra spaces in environment variables

### "Spreadsheet not found" Error
- Run `initialSetup()` again in Apps Script
- Check Script Properties has SPREADSHEET_ID

### PDF Download Fails
- Check browser allows popups from your domain
- Try different browser

### CORS Errors
- Update ALLOWED_ORIGINS in Code.gs
- Redeploy Apps Script

### Sessions Not Persisting
- Verify SESSION_SECRET is set in Vercel
- Check ADMIN_PASSWORD matches between Vercel and Apps Script

---

## PRODUCTION VALUES RECORD

Fill in after setup:

| Item | Value |
|------|-------|
| Spreadsheet ID | |
| Spreadsheet URL | |
| Drive Folder ID | |
| Apps Script Web App URL | |
| API Key | |
| Vercel Project URL | |
| Admin Password | |

---

## MAINTENANCE

### Updating Apps Script

1. Make changes in local `apps-script/` files
2. Copy to Apps Script Editor
3. Click **Deploy** → **Manage deployments**
4. Click pencil icon on active deployment
5. Select **"New version"**
6. Click **Deploy**

### Viewing Logs

1. Go to Apps Script Editor
2. Click **Executions** in left sidebar
3. Click any execution to see details

### Backup Data

1. Open Google Sheet
2. File → Download → Microsoft Excel (.xlsx)
3. Store backup securely

---

## DONE

Your Vodafone Cash Tracker is now live at:
`https://your-project.vercel.app`

Login with your admin password to start using the system.
