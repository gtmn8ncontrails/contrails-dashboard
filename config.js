// ============================================
// CONTRAILS AI — GTM INTELLIGENCE DASHBOARD
// config.js  ← EDIT THIS FILE TO CONNECT YOUR DATA
// ============================================

const CONFIG = {

  // ── GOOGLE SHEETS ───────────────────────────────────────────────────
  // Step 1: Share your Google Sheet → "Anyone with the link can view"
  // Step 2: Go to console.cloud.google.com → Enable "Google Sheets API"
  //         → Create an API key (no auth required for read-only public sheets)
  // Step 3: Paste your Sheet ID and API key below

  SHEET_ID:  'YOUR_GOOGLE_SHEET_ID_HERE',
  // e.g.    '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms'
  // (it's the long string in the URL of your Google Sheet)

  API_KEY:   'YOUR_GOOGLE_API_KEY_HERE',
  // e.g.    'AIzaSyD...'

  // Tab names — must match EXACTLY as they appear in your Google Sheet
  TABS: {
    GTM_SIGNALS:     'GTM Signals',
    APPROVED_BRIEFS: 'Approved Briefs',
    STAGE3_QUEUE:    'Stage 3 Queue',
  },

  // Auto-refresh every N minutes (set to 0 to disable)
  REFRESH_INTERVAL_MINUTES: 5,


  // ── N8N WORKFLOW WEBHOOKS ────────────────────────────────────────────
  // For each workflow, add a "Webhook" trigger node in n8n.
  // Set it to POST, copy the Production URL, paste it below.
  // Leave as empty string '' to disable that workflow button.

  N8N_WEBHOOKS: {
    stage1: '',   // e.g. 'https://your-n8n.app.n8n.cloud/webhook/abc123'
    stage2: '',   // Stage 2 processing webhook URL
    stage3: '',   // Stage 3 content generation webhook URL
  },


  // ── DEMO MODE ────────────────────────────────────────────────────────
  // If true, uses built-in mock data (no API calls made).
  // Set to false once you've filled in SHEET_ID and API_KEY above.

  DEMO_MODE: true,

};
