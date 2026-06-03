# Contrails AI — GTM Intelligence Dashboard
## Setup & Deployment Guide

---

## 1. Preview Locally (Right Now — No Install Needed)

Since this is a plain HTML/JS app, **you can't just double-click index.html** (browsers block API calls from `file://`). You need a local server. Two options:

### Option A: Python (usually pre-installed on Windows)
```bash
# In the contrails-dashboard folder:
python -m http.server 8080
# Then open: http://localhost:8080
```

### Option B: VS Code Live Server extension
- Install the "Live Server" extension in VS Code
- Right-click `index.html` → "Open with Live Server"

The app will open in **Demo Mode** with sample data matching your Google Sheet structure.

---

## 2. Connect Your Google Sheet (Live Data)

### Step 1 — Share your Google Sheet
1. Open your Google Sheet
2. Click **Share** → **Change to anyone with the link** → **Viewer**
3. Copy the Sheet ID from the URL:  
   `https://docs.google.com/spreadsheets/d/`**`THIS_IS_YOUR_SHEET_ID`**`/edit`

### Step 2 — Get a Google API Key
1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project (or use existing)
3. Search "Google Sheets API" → **Enable**
4. Go to **APIs & Services → Credentials → Create Credentials → API Key**
5. (Optional) Restrict it to "Google Sheets API" for security
6. Copy the key

### Step 3 — Edit config.js
Open `config.js` and fill in:
```javascript
SHEET_ID: 'your_sheet_id_here',
API_KEY:  'your_api_key_here',
DEMO_MODE: false,   // ← switch this to false
```

Also confirm your tab names match exactly:
```javascript
TABS: {
  GTM_SIGNALS:     'GTM Signals',      // ← must match your tab name exactly
  APPROVED_BRIEFS: 'Approved Briefs',
  STAGE3_QUEUE:    'Stage 3 Queue',
}
```

---

## 3. Connect n8n Workflows

For each workflow, add a **Webhook node** in n8n:
1. Open your Stage 1 workflow in n8n
2. Add a **Webhook** trigger node at the start
3. Set method to **POST**
4. Click **Listen for test event** to get the URL
5. Switch to **Production URL** for the live URL
6. Paste into `config.js`:

```javascript
N8N_WEBHOOKS: {
  stage1: 'https://your-n8n.app.n8n.cloud/webhook/abc123',
  stage2: 'https://your-n8n.app.n8n.cloud/webhook/def456',
  stage3: 'https://your-n8n.app.n8n.cloud/webhook/ghi789',
},
```

---

## 4. Deploy (Free Hosting via Vercel)

1. Push the `contrails-dashboard` folder to a GitHub repo
2. Go to [vercel.com](https://vercel.com) → **New Project** → Import your repo
3. No build settings needed — just click **Deploy**
4. Vercel gives you a URL like `contrails-ai.vercel.app`

### Install on Phone
- **iPhone**: Open the URL in Safari → Share button → "Add to Home Screen"
- **Android**: Open in Chrome → 3-dot menu → "Add to Home Screen" / "Install App"

The app will open full-screen like a native app, with your Contrails AI icon.

---

## 5. File Structure

```
contrails-dashboard/
├── index.html          ← App shell (no changes needed)
├── style.css           ← All styles (edit to customize)
├── config.js           ← ⭐ YOUR SETTINGS GO HERE
├── mock-data.js        ← Sample data (used in demo mode)
├── app.js              ← App logic (no changes needed)
├── manifest.json       ← PWA settings
├── sw.js               ← Service worker (offline support)
└── icons/
    ├── icon.svg        ← Browser tab favicon
    ├── icon-192.svg    ← Phone home screen icon
    └── icon-512.svg    ← Splash screen icon
```

---

## 6. Google Sheet Column Requirements

Your sheet tabs must have these column headers (row 1) for the app to parse them correctly:

### GTM Signals tab
`url` | `source_type` | `title` | `relevance_score` | `affected_persona` | `region` | `urgency` | `summary` | `pub_date` | `is_competitor_signal` | `cluster_topic` | `persona_guidance`

### Approved Briefs tab
`title` | `cluster_topic` | `affected_persona` | `region` | `summary` | `persona_guidance` | `approved_date` | `stage`

### Stage 3 Queue tab
`id` | `title` | `brief_ref` | `persona` | `format` | `priority` | `status` | `created_date` | `assigned_to`

> **Column names are case-insensitive and spaces are converted to underscores automatically.**

---

## Troubleshooting

| Issue | Fix |
|---|---|
| "Failed to load data" | Check Sheet ID and API key in config.js; verify sheet is shared publicly |
| Workflow button says "Webhook not configured" | Add n8n webhook URLs to config.js |
| App doesn't install on phone | Must be served over HTTPS (Vercel handles this automatically) |
| Data doesn't refresh | Click the ↻ button in the header; or wait for auto-refresh (every 5 min) |
| Tab names not found | Check exact tab names in your Google Sheet match CONFIG.TABS values |
