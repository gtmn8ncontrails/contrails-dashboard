// ============================================
// CONTRAILS AI — GTM INTELLIGENCE DASHBOARD
// app.js — Main application
// ============================================

// ── STATE ──────────────────────────────────────────────────────────────
const STATE = {
  page: 'dashboard',
  signals: [],
  briefs: [],
  queue: [],
  loading: false,
  lastUpdated: null,
  filters: {
    urgency: 'all',
    sourceType: 'all',
    search: '',
  },
  workflows: {
    stage1: { status: 'idle', lastRun: null, progress: 0 },
    stage2: { status: 'idle', lastRun: null, progress: 0 },
    stage3: { status: 'idle', lastRun: null, progress: 0 },
  },
};

const PAGE_TITLES = {
  dashboard: 'Overview',
  signals:   'GTM Signals',
  briefs:    'Approved Briefs',
  queue:     'Stage 3 Queue',
  workflows: 'Run Workflows',
};

// ── INIT ───────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  // Register service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  // Animate splash then show app
  setTimeout(() => {
    const splash = document.getElementById('splash');
    const main   = document.getElementById('main');
    splash.classList.add('fade-out');
    setTimeout(() => {
      splash.style.display = 'none';
      main.classList.remove('hidden');
      loadAllData();
    }, 500);
  }, 1800);

  // Auto-refresh
  if (CONFIG.REFRESH_INTERVAL_MINUTES > 0) {
    setInterval(loadAllData, CONFIG.REFRESH_INTERVAL_MINUTES * 60 * 1000);
  }
});

// ── DATA LOADING ───────────────────────────────────────────────────────
async function loadAllData() {
  setSyncStatus('loading');
  const btn = document.getElementById('refresh-btn');
  if (btn) btn.classList.add('spinning');

  try {
    if (CONFIG.DEMO_MODE) {
      await simulateDelay(600);
      STATE.signals = MOCK_DATA.gtmSignals;
      STATE.briefs  = MOCK_DATA.approvedBriefs;
      STATE.queue   = MOCK_DATA.stage3Queue;
    } else {
      const [signals, briefs, queue] = await Promise.all([
        fetchSheet(CONFIG.TABS.GTM_SIGNALS),
        fetchSheet(CONFIG.TABS.APPROVED_BRIEFS),
        fetchSheet(CONFIG.TABS.STAGE3_QUEUE),
      ]);
      STATE.signals = signals;
      STATE.briefs  = briefs;
      STATE.queue   = queue;
    }

    STATE.lastUpdated = new Date();
    setSyncStatus('success');
    renderPage(STATE.page);
    updateLastUpdated();
  } catch (err) {
    console.error('Data load error:', err);
    setSyncStatus('error');
    showToast('⚠️ Failed to load data. Showing cached data.');
    // Fall back to mock data
    STATE.signals = MOCK_DATA.gtmSignals;
    STATE.briefs  = MOCK_DATA.approvedBriefs;
    STATE.queue   = MOCK_DATA.stage3Queue;
    renderPage(STATE.page);
  } finally {
    if (btn) btn.classList.remove('spinning');
  }
}

async function fetchSheet(tabName) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SHEET_ID}/values/${encodeURIComponent(tabName)}?key=${CONFIG.API_KEY}`;
  const res  = await fetch(url);
  if (!res.ok) throw new Error(`Sheets API error: ${res.status}`);
  const data = await res.json();
  const rows = data.values || [];
  if (rows.length < 2) return [];
  const headers = rows[0].map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
  return rows.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i] || ''; });
    // Normalize types
    if (obj.relevance_score) obj.relevance_score = parseInt(obj.relevance_score) || 0;
    if (obj.is_competitor_signal) obj.is_competitor_signal = obj.is_competitor_signal.toUpperCase() === 'TRUE';
    return obj;
  });
}

function simulateDelay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ── ROUTER ─────────────────────────────────────────────────────────────
function navigate(page) {
  STATE.page = page;

  // Update bottom nav
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.page === page);
  });

  // Update header title
  document.getElementById('page-title').textContent = PAGE_TITLES[page] || page;

  renderPage(page);
}

function renderPage(page) {
  const content = document.getElementById('page-content');
  let html = '';

  switch (page) {
    case 'dashboard': html = renderDashboard(); break;
    case 'signals':   html = renderSignals();   break;
    case 'briefs':    html = renderBriefs();     break;
    case 'queue':     html = renderQueue();      break;
    case 'workflows': html = renderWorkflows();  break;
    default:          html = renderDashboard();
  }

  content.innerHTML = `<div class="page-enter">${html}</div>`;

  // Re-attach event listeners
  if (page === 'signals') attachSignalFilters();
  if (page === 'workflows') restoreWorkflowStates();

  updateLastUpdated();
}

// ── DASHBOARD ──────────────────────────────────────────────────────────
function renderDashboard() {
  const signals  = STATE.signals;
  const briefs   = STATE.briefs;
  const queue    = STATE.queue;

  const high   = signals.filter(s => s.urgency === 'high').length;
  const medium = signals.filter(s => s.urgency === 'medium').length;
  const low    = signals.filter(s => s.urgency === 'low').length;
  const total  = signals.length;

  const pending   = queue.filter(q => q.status === 'pending' || q.status === 'generating').length;
  const competitors = signals.filter(s => s.is_competitor_signal === true || s.is_competitor_signal === 'TRUE').length;

  const greet = getGreeting();
  const date  = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  const recentSignals = [...signals]
    .sort((a, b) => {
      const scoreA = a.relevance_score ? Number(a.relevance_score) : 0;
      const scoreB = b.relevance_score ? Number(b.relevance_score) : 0;
      if (scoreA !== scoreB) {
        return scoreB - scoreA;
      }
      const getUrgencyWeight = (urgency) => {
        if (!urgency) return 0;
        const u = String(urgency).toLowerCase();
        if (u === 'high') return 3;
        if (u === 'medium' || u === 'med') return 2;
        if (u === 'low') return 1;
        return 0;
      };
      return getUrgencyWeight(b.urgency) - getUrgencyWeight(a.urgency);
    })
    .slice(0, 4);

  const highPct   = total ? Math.round((high / total) * 100)   : 0;
  const medPct    = total ? Math.round((medium / total) * 100) : 0;
  const lowPct    = total ? Math.round((low / total) * 100)    : 0;

  return `
    <div class="page-header">
      <div class="page-greeting">${greet}, <span>Contrails AI</span></div>
      <div class="page-sub">${date}</div>
    </div>

    ${CONFIG.DEMO_MODE ? `
    <div class="alert-banner" style="margin:12px 18px 0;">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
      <p><strong>Demo Mode</strong> — Showing sample data. Edit <code>config.js</code> to connect your Google Sheet.</p>
    </div>` : ''}

    <div class="section" style="padding-top:16px;">
      <div class="hero-strip">
        <div class="hero-strip-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
          </svg>
        </div>
        <div class="hero-strip-text">
          <h3>Pipeline Active</h3>
          <p>${total} signals across ${[...new Set(signals.map(s=>s.region))].filter(Boolean).length} regions</p>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Intelligence Summary</div>
      <div class="stat-grid">
        ${statCard(total, 'Total Signals', 'purple', `<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>`)}
        ${statCard(high, 'High Urgency', 'red', `<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>`)}
        ${statCard(briefs.length, 'Approved Briefs', 'blue', `<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline>`)}
        ${statCard(pending, 'In Queue', 'green', `<line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line>`)}
      </div>
    </div>

    <div class="section">
      <div class="section-title">Urgency Breakdown</div>
      <div class="urgency-bar-wrap">
        <div class="urgency-row">
          <span class="urgency-label high">High</span>
          <div class="urgency-track"><div class="urgency-fill high" style="width:${highPct}%"></div></div>
          <span class="urgency-count">${high}</span>
        </div>
        <div class="urgency-row">
          <span class="urgency-label medium">Med</span>
          <div class="urgency-track"><div class="urgency-fill medium" style="width:${medPct}%"></div></div>
          <span class="urgency-count">${medium}</span>
        </div>
        <div class="urgency-row">
          <span class="urgency-label low">Low</span>
          <div class="urgency-track"><div class="urgency-fill low" style="width:${lowPct}%"></div></div>
          <span class="urgency-count">${low}</span>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Top Signals</div>
      <div class="signal-mini-list">
        ${recentSignals.map((s, i) => signalMiniCard(s, i)).join('')}
      </div>
      <button onclick="navigate('signals')" style="width:100%;padding:12px;border-radius:var(--radius);
        border:1px solid var(--border2);background:var(--card);color:var(--text2);
        font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;
        transition:all var(--transition);margin-bottom:8px;"
        onmouseover="this.style.borderColor='var(--primary)';this.style.color='var(--primary-l)'"
        onmouseout="this.style.borderColor='var(--border2)';this.style.color='var(--text2)'">
        View All ${total} Signals →
      </button>
    </div>

    <div class="section">
      <div class="section-title">Source Breakdown</div>
      <div style="display:flex;flex-direction:column;gap:6px;">
        ${sourceBreakdown(signals)}
      </div>
    </div>
    <div style="height:8px;"></div>
  `;
}

function statCard(value, label, color, iconPath) {
  return `
    <div class="stat-card">
      <div class="stat-icon ${color}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          ${iconPath}
        </svg>
      </div>
      <div class="stat-value">${value}</div>
      <div class="stat-label">${label}</div>
    </div>`;
}

function signalMiniCard(s, index) {
  return `
    <div class="signal-mini" onclick="openSignalModal(${index})">
      <div class="signal-mini-left">
        ${urgencyDot(s.urgency)}
      </div>
      <div class="signal-mini-body">
        <div class="signal-mini-title">${escHtml(s.title)}</div>
        <div class="signal-mini-meta">
          ${sourceBadge(s.source_type)}
          ${s.region ? `<span class="badge gray">${escHtml(s.region)}</span>` : ''}
        </div>
      </div>
      <div class="signal-mini-arrow">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </div>
    </div>`;
}

function urgencyDot(urgency) {
  const colors = { high: 'var(--high)', medium: 'var(--medium)', low: 'var(--low)' };
  const color = colors[urgency] || 'var(--text3)';
  return `<div style="width:8px;height:8px;border-radius:50%;background:${color};margin-top:4px;flex-shrink:0;box-shadow:0 0 6px ${color};"></div>`;
}

function sourceBreakdown(signals) {
  const types = {};
  signals.forEach(s => {
    const t = s.source_type || 'unknown';
    types[t] = (types[t] || 0) + 1;
  });
  const total = signals.length || 1;
  return Object.entries(types).map(([type, count]) => `
    <div style="display:flex;align-items:center;gap:10px;">
      ${sourceBadge(type)}
      <div style="flex:1;height:5px;background:var(--surface);border-radius:99px;overflow:hidden;">
        <div style="height:100%;width:${Math.round(count/total*100)}%;background:var(--grad);border-radius:99px;"></div>
      </div>
      <span style="font-size:11px;color:var(--text3);font-weight:600;width:16px;text-align:right;">${count}</span>
    </div>`).join('');
}

// ── SIGNALS PAGE ───────────────────────────────────────────────────────
function renderSignals() {
  const urgencies   = ['all', 'high', 'medium', 'low'];
  const sourceTypes = ['all', 'competitor_signal', 'government_reg', 'government_site', 'research_paper', 'conference'];
  const sourceLabels = {
    all: 'All Types', competitor_signal: 'Competitor',
    government_reg: 'Regulatory', government_site: 'CISA/Gov',
    research_paper: 'Research', conference: 'Events',
  };

  const filtered = getFilteredSignals();

  return `
    <div class="search-wrap">
      <div class="search-bar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input id="signal-search" type="text" placeholder="Search signals, summaries…"
          value="${escAttr(STATE.filters.search)}"
          oninput="STATE.filters.search=this.value;renderSignalsList()">
      </div>
    </div>

    <div class="filter-scroll" id="urgency-filters">
      ${urgencies.map(u => `
        <button class="chip ${STATE.filters.urgency === u ? 'active' : ''}"
          onclick="STATE.filters.urgency='${u}';updateFilterChips('urgency-filters',this);renderSignalsList()">
          ${u === 'all' ? 'All Urgency' : ucFirst(u)}
        </button>`).join('')}
    </div>

    <div class="filter-scroll" id="source-filters">
      ${sourceTypes.map(t => `
        <button class="chip ${STATE.filters.sourceType === t ? 'active' : ''}"
          onclick="STATE.filters.sourceType='${t}';updateFilterChips('source-filters',this);renderSignalsList()">
          ${sourceLabels[t]}
        </button>`).join('')}
    </div>

    <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 18px 2px;">
      <span style="font-size:12px;color:var(--text3);" id="signal-count">${filtered.length} of ${STATE.signals.length} signals</span>
    </div>

    <div class="signals-list" id="signals-list">
      ${renderSignalCards(filtered)}
    </div>
    <div style="height:8px;"></div>
  `;
}

function getFilteredSignals() {
  return STATE.signals.filter(s => {
    const urgMatch = STATE.filters.urgency === 'all' || s.urgency === STATE.filters.urgency;
    const srcMatch = STATE.filters.sourceType === 'all' || s.source_type === STATE.filters.sourceType;
    const q = STATE.filters.search.toLowerCase();
    const searchMatch = !q ||
      (s.title || '').toLowerCase().includes(q) ||
      (s.summary || '').toLowerCase().includes(q) ||
      (s.cluster_topic || '').toLowerCase().includes(q) ||
      (s.region || '').toLowerCase().includes(q);
    return urgMatch && srcMatch && searchMatch;
  });
}

function renderSignalCards(signals) {
  if (!signals.length) return `
    <div class="no-results">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>
      </svg>
      <p>No signals found</p>
      <span>Try adjusting your filters or search term</span>
    </div>`;

  return signals.map((s, i) => {
    const globalIdx = STATE.signals.indexOf(s);
    return `
    <div class="signal-card" onclick="openSignalModal(${globalIdx})">
      <div class="sc-header">
        <div class="sc-badges">
          <span class="badge ${s.urgency}">${escHtml(s.urgency || 'unknown')}</span>
          ${sourceBadge(s.source_type)}
          ${s.is_competitor_signal === true || s.is_competitor_signal === 'TRUE'
            ? `<span class="badge purple"><span class="dot"></span>Competitor</span>` : ''}
        </div>
        <div class="sc-score" title="Relevance score">${s.relevance_score || '?'}</div>
      </div>
      <div class="sc-title">${escHtml(s.title)}</div>
      <div class="sc-summary">${escHtml(s.summary)}</div>
      <div class="sc-footer">
        <div class="sc-meta">
          ${s.region ? `<span class="sc-meta-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="2" y1="12" x2="22" y2="12"></line>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
            </svg>
            ${escHtml(s.region)}</span>` : ''}
          ${s.pub_date ? `<span class="sc-meta-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            ${escHtml(s.pub_date)}</span>` : ''}
          ${s.cluster_topic ? `<span class="sc-meta-item" style="color:var(--primary-l);">${escHtml(s.cluster_topic)}</span>` : ''}
        </div>
        <div class="sc-arrow">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </div>
      </div>
    </div>`;
  }).join('');
}

function attachSignalFilters() {
  // Search already has oninput; chips have onclick — nothing extra needed
}

function updateFilterChips(containerId, clickedBtn) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  clickedBtn.classList.add('active');
}

function renderSignalsList() {
  const filtered = getFilteredSignals();
  const list = document.getElementById('signals-list');
  const count = document.getElementById('signal-count');
  if (list) list.innerHTML = renderSignalCards(filtered);
  if (count) count.textContent = `${filtered.length} of ${STATE.signals.length} signals`;
}

// ── APPROVED BRIEFS ────────────────────────────────────────────────────
function renderBriefs() {
  const briefs = STATE.briefs;

  return `
    <div class="page-section-header">
      <div>
        <div style="font-size:18px;font-weight:800;letter-spacing:-0.3px;">Approved Briefs</div>
        <div style="font-size:12px;color:var(--text3);margin-top:2px;">Ready for content generation</div>
      </div>
      <span class="count-pill">${briefs.length}</span>
    </div>

    <div style="padding:14px 18px 0;display:flex;flex-direction:column;gap:12px;" class="brief-list">
      ${briefs.length ? briefs.map((b, i) => briefCard(b, i)).join('') : `
        <div class="no-results">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
          </svg>
          <p>No approved briefs yet</p>
          <span>Briefs will appear here after Stage 2 processing</span>
        </div>`}
    </div>
    <div style="height:8px;"></div>
  `;
}

function briefCard(b, index) {
  return `
    <div class="brief-card">
      <div class="brief-header">
        <div class="brief-cluster">${escHtml(b.cluster_topic || '')}</div>
        <div class="brief-title">${escHtml(b.title)}</div>
        <div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap;">
          ${b.affected_persona ? `<span class="badge blue">${escHtml(b.affected_persona)}</span>` : ''}
          ${b.region ? `<span class="badge gray">${escHtml(b.region)}</span>` : ''}
          ${b.stage ? `<span class="badge purple">${escHtml(b.stage)}</span>` : ''}
        </div>
      </div>
      <div class="brief-body">
        <div class="brief-section-label">Brief Summary</div>
        <div class="brief-summary">${escHtml(b.summary)}</div>
        <div class="brief-section-label">Persona Guidance</div>
        <div class="brief-persona">"${escHtml(b.persona_guidance)}"</div>
      </div>
      <div class="brief-footer">
        <button class="copy-btn" onclick="copyText(${JSON.stringify(b.summary || '')}, 'Summary copied!')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
          Copy Summary
        </button>
        <button class="copy-btn" onclick="copyText(${JSON.stringify(b.persona_guidance || '')}, 'Guidance copied!')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
          Copy Guidance
        </button>
      </div>
    </div>`;
}

// ── STAGE 3 QUEUE ──────────────────────────────────────────────────────
function renderQueue() {
  const queue = STATE.queue;
  const byStatus = {
    generating: queue.filter(q => q.status === 'generating'),
    pending:    queue.filter(q => q.status === 'pending'),
    draft:      queue.filter(q => q.status === 'draft'),
    approved:   queue.filter(q => q.status === 'approved'),
    published:  queue.filter(q => q.status === 'published'),
  };

  const sections = [
    { key: 'generating', label: '🔄 Generating',  color: 'var(--blue)' },
    { key: 'pending',    label: '⏳ Pending',      color: 'var(--medium)' },
    { key: 'draft',      label: '📝 Draft',        color: 'var(--text2)' },
    { key: 'approved',   label: '✅ Approved',     color: 'var(--low)' },
    { key: 'published',  label: '🚀 Published',    color: 'var(--primary-l)' },
  ];

  return `
    <div class="page-section-header">
      <div>
        <div style="font-size:18px;font-weight:800;letter-spacing:-0.3px;">Stage 3 Queue</div>
        <div style="font-size:12px;color:var(--text3);margin-top:2px;">Content generation pipeline</div>
      </div>
      <span class="count-pill">${queue.length}</span>
    </div>

    ${sections.map(sec => byStatus[sec.key].length ? `
      <div class="section">
        <div class="section-title" style="color:${sec.color};">${sec.label}</div>
        <div class="queue-list" style="padding:0;">
          ${byStatus[sec.key].map((q, i) => queueItem(q, i)).join('')}
        </div>
      </div>` : '').join('')}

    ${!queue.length ? `
      <div class="no-results" style="padding-top:80px;">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line>
          <line x1="8" y1="18" x2="21" y2="18"></line>
          <line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line>
          <line x1="3" y1="18" x2="3.01" y2="18"></line>
        </svg>
        <p>Queue is empty</p><span>Run Stage 3 to generate content from approved briefs</span>
      </div>` : ''}
    <div style="height:8px;"></div>
  `;
}

function queueItem(q, index) {
  const statusMap = {
    pending:    { cls: 'pending',    label: 'Pending' },
    generating: { cls: 'generating', label: '● Generating' },
    draft:      { cls: 'draft',      label: 'Draft' },
    approved:   { cls: 'approved',   label: 'Approved' },
    published:  { cls: 'published',  label: 'Published' },
  };
  const st = statusMap[q.status] || { cls: 'draft', label: q.status };

  return `
    <div class="queue-item">
      <div class="queue-rank">${q.id || (index + 1)}</div>
      <div class="queue-body">
        <div class="queue-title">${escHtml(q.title)}</div>
        <div class="queue-meta">
          <span class="status-badge ${st.cls}">${st.label}</span>
          ${q.format ? `<span class="badge gray">${escHtml(q.format)}</span>` : ''}
          ${q.persona ? `<span class="badge blue">${escHtml(q.persona)}</span>` : ''}
          ${q.priority === 'high' ? `<span class="badge high">High Priority</span>` : ''}
        </div>
      </div>
    </div>`;
}

// ── WORKFLOWS PAGE ─────────────────────────────────────────────────────
function renderWorkflows() {
  const workflows = [
    {
      id: 'stage1',
      stage: 'Stage 1',
      title: 'Data Scraping Pipeline',
      desc: 'Scrapes competitor signals, arXiv research papers, trust & safety conference dates, and AI regulation updates (EU, US, UK, Global). Outputs to GTM Signals tab in Google Sheets.',
      tags: ['Competitors', 'ArXiv', 'CISA', 'EU AI Act', 'NIS2', 'Conferences'],
      outputTab: 'GTM Signals',
      estTime: '~8 min',
    },
    {
      id: 'stage2',
      stage: 'Stage 2',
      title: 'Signal Processing & Brief Generation',
      desc: 'Takes GTM Signals, clusters them by topic and persona, scores relevance, generates structured intelligence briefs, and routes approved briefs to the Approved Briefs tab.',
      tags: ['Clustering', 'Relevance Scoring', 'Brief Generation', 'QA'],
      outputTab: 'Approved Briefs',
      estTime: '~5 min',
    },
    {
      id: 'stage3',
      stage: 'Stage 3',
      title: 'Content Generation',
      desc: 'Takes approved briefs and generates sales narratives, LinkedIn posts, X threads, cold email sequences, and deck slides for each persona. Outputs to Stage 3 Queue.',
      tags: ['LinkedIn', 'X/Twitter', 'Email Sequences', 'Sales Narratives', 'Deck Slides'],
      outputTab: 'Stage 3 Queue',
      estTime: '~12 min',
    },
  ];

  const hasWebhooks = Object.values(CONFIG.N8N_WEBHOOKS).some(v => v && v.length > 0);

  return `
    <div class="workflows-page">
      ${!hasWebhooks ? `
      <div class="workflows-intro">
        <strong>Setup required:</strong> To enable workflow triggers, add your n8n webhook URLs to <code>config.js</code> under <code>N8N_WEBHOOKS</code>.
        Each n8n workflow needs a <strong>Webhook Trigger node</strong> — copy its Production URL and paste it in config.
      </div>` : `
      <div class="workflows-intro">
        Trigger your n8n pipelines directly from this dashboard. Workflows run in the background — refresh data when complete.
      </div>`}

      ${workflows.map(wf => workflowCard(wf)).join('')}
    </div>
    <div style="height:8px;"></div>
  `;
}

function workflowCard(wf) {
  const st = STATE.workflows[wf.id];
  const webhookSet = CONFIG.N8N_WEBHOOKS[wf.id] && CONFIG.N8N_WEBHOOKS[wf.id].length > 0;

  const statusLabels = { idle: 'Ready', running: '● Running', success: '✓ Completed', error: '✕ Error' };
  const statusCls = st.status;

  const btnLabels = { idle: 'Run Now', running: 'Running…', success: '✓ Completed', error: 'Retry' };
  const btnIcons  = {
    idle:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`,
    running: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="animation:spin 1s linear infinite"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>`,
    success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
    error:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`,
  };

  return `
    <div class="workflow-card" id="wf-card-${wf.id}">
      <div class="wf-header">
        <div class="wf-title-group">
          <div class="wf-stage-label">${wf.stage}</div>
          <div class="wf-title">${wf.title}</div>
        </div>
        <div class="wf-status-pill ${statusCls}" id="wf-status-${wf.id}">
          ${statusLabels[st.status]}
        </div>
      </div>
      <div class="wf-body">
        <div class="wf-desc">${wf.desc}</div>
        <div class="wf-meta">
          <div class="wf-meta-item">Output: <strong>${wf.outputTab}</strong></div>
          <div class="wf-meta-item">Est. time: <strong>${wf.estTime}</strong></div>
          ${st.lastRun ? `<div class="wf-meta-item">Last run: <strong>${formatTime(st.lastRun)}</strong></div>` : ''}
          ${webhookSet ? `<div class="wf-meta-item" style="color:var(--low);">● Webhook configured</div>`
                       : `<div class="wf-meta-item" style="color:var(--text3);">○ No webhook set</div>`}
        </div>
        <div class="wf-tags">
          ${wf.tags.map(t => `<span class="tag">${escHtml(t)}</span>`).join('')}
        </div>
        <button class="run-btn ${st.status}" id="wf-btn-${wf.id}"
          onclick="triggerWorkflow('${wf.id}')"
          ${st.status === 'running' ? 'disabled' : ''}
          ${!webhookSet ? 'title="Add webhook URL to config.js to enable"' : ''}>
          ${btnIcons[st.status] || btnIcons.idle}
          <span id="wf-btn-label-${wf.id}">${webhookSet ? btnLabels[st.status] : 'Webhook not configured'}</span>
        </button>
      </div>
      <div class="run-progress" id="wf-progress-${wf.id}">
        <div class="run-progress-bar ${st.status === 'running' ? 'running' : ''}"
          style="width:${st.progress}%"></div>
      </div>
    </div>`;
}

function restoreWorkflowStates() {
  // Re-apply live workflow states after re-render
  Object.keys(STATE.workflows).forEach(id => {
    applyWorkflowUI(id, STATE.workflows[id].status, STATE.workflows[id].progress);
  });
}

// ── WORKFLOW TRIGGER ───────────────────────────────────────────────────
async function triggerWorkflow(stageId) {
  const webhook = CONFIG.N8N_WEBHOOKS[stageId];

  if (!webhook) {
    showToast('⚠️ Add webhook URL to config.js first');
    return;
  }

  if (STATE.workflows[stageId].status === 'running') return;

  setWorkflowStatus(stageId, 'running', 0);

  // Animate progress
  let prog = 0;
  const progInterval = setInterval(() => {
    prog = Math.min(prog + Math.random() * 4, 88);
    const bar = document.getElementById(`wf-progress-${stageId}`);
    if (bar) bar.querySelector('.run-progress-bar').style.width = prog + '%';
    STATE.workflows[stageId].progress = prog;
  }, 500);

  try {
    const res = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ triggered_from: 'contrails-dashboard', stage: stageId, timestamp: new Date().toISOString() }),
    });

    clearInterval(progInterval);

    if (res.ok) {
      STATE.workflows[stageId].lastRun = new Date();
      setWorkflowStatus(stageId, 'success', 100);
      showToast(`✅ ${ucFirst(stageId)} triggered successfully`);
      setTimeout(() => setWorkflowStatus(stageId, 'idle', 0), 8000);
    } else {
      throw new Error(`HTTP ${res.status}`);
    }
  } catch (err) {
    clearInterval(progInterval);
    setWorkflowStatus(stageId, 'error', 0);
    showToast(`❌ Workflow failed: ${err.message}`);
    setTimeout(() => setWorkflowStatus(stageId, 'idle', 0), 6000);
  }
}

function setWorkflowStatus(id, status, progress) {
  STATE.workflows[id].status   = status;
  STATE.workflows[id].progress = progress;
  applyWorkflowUI(id, status, progress);
}

function applyWorkflowUI(id, status, progress) {
  const pill  = document.getElementById(`wf-status-${id}`);
  const btn   = document.getElementById(`wf-btn-${id}`);
  const label = document.getElementById(`wf-btn-label-${id}`);
  const bar   = document.getElementById(`wf-progress-${id}`);

  const statusLabels = { idle: 'Ready', running: '● Running', success: '✓ Completed', error: '✕ Error' };
  const btnLabels    = { idle: 'Run Now', running: 'Running…', success: '✓ Completed', error: 'Retry' };

  if (pill)  { pill.className = `wf-status-pill ${status}`; pill.textContent = statusLabels[status]; }
  if (btn)   { btn.className  = `run-btn ${status}`; btn.disabled = (status === 'running'); }
  if (label) { label.textContent = btnLabels[status] || 'Run Now'; }
  if (bar) {
    const pb = bar.querySelector('.run-progress-bar');
    if (pb) {
      pb.style.width = progress + '%';
      pb.className   = `run-progress-bar ${status === 'running' ? 'running' : ''}`;
    }
  }
}

// ── SIGNAL MODAL ───────────────────────────────────────────────────────
function openSignalModal(index) {
  const s = STATE.signals[index];
  if (!s) return;

  const overlay = document.getElementById('modal-overlay');
  const badge   = document.getElementById('modal-badge');
  const content = document.getElementById('modal-content');

  badge.className = `badge ${s.urgency || 'gray'}`;
  badge.innerHTML = `<span class="dot"></span>${ucFirst(s.urgency || 'unknown')} urgency`;

  content.innerHTML = `
    <div class="modal-title">${escHtml(s.title)}</div>

    <div class="modal-section">
      <div class="modal-section-label">Summary</div>
      <div class="modal-text">${escHtml(s.summary)}</div>
    </div>

    ${s.persona_guidance ? `
    <div class="modal-section">
      <div class="modal-section-label">Persona Guidance</div>
      <div class="modal-text" style="border-left:2px solid var(--primary);padding-left:10px;color:var(--text);">${escHtml(s.persona_guidance)}</div>
    </div>` : ''}

    <div class="modal-section">
      <div class="modal-section-label">Signal Details</div>
      <div class="modal-meta-grid">
        ${metaBox('Source', formatSourceType(s.source_type))}
        ${metaBox('Region', s.region || '—')}
        ${metaBox('Urgency', ucFirst(s.urgency || '—'))}
        ${metaBox('Relevance', `${s.relevance_score || '—'} / 10`)}
        ${metaBox('Persona', s.affected_persona || '—')}
        ${metaBox('Published', s.pub_date || '—')}
        ${metaBox('Cluster', s.cluster_topic || '—')}
        ${metaBox('Competitor', s.is_competitor_signal === true || s.is_competitor_signal === 'TRUE' ? 'Yes' : 'No')}
      </div>
    </div>

    ${s.url ? `
    <div class="modal-section">
      <div class="modal-section-label">Source URL</div>
      <a href="${escAttr(s.url)}" target="_blank" rel="noopener noreferrer" class="modal-link">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
          <polyline points="15 3 21 3 21 9"></polyline>
          <line x1="10" y1="14" x2="21" y2="3"></line>
        </svg>
        ${escHtml(s.url.length > 60 ? s.url.substring(0, 60) + '…' : s.url)}
      </a>
    </div>` : ''}

    <div style="display:flex;gap:8px;margin-top:4px;">
      <button class="copy-btn" style="flex:1;" onclick="copyText(${JSON.stringify(s.summary || '')}, 'Summary copied!')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
        Copy Summary
      </button>
      <button class="copy-btn" style="flex:1;" onclick="copyText(${JSON.stringify(s.persona_guidance || '')}, 'Guidance copied!')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
        Copy Guidance
      </button>
    </div>
  `;

  overlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
  document.body.style.overflow = '';
}

function metaBox(key, val) {
  return `
    <div class="modal-meta-box">
      <div class="modal-meta-key">${escHtml(key)}</div>
      <div class="modal-meta-val">${escHtml(String(val))}</div>
    </div>`;
}

// ── UTILITIES ──────────────────────────────────────────────────────────
function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escAttr(str) {
  if (!str) return '';
  return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function ucFirst(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatTime(date) {
  if (!date) return '—';
  return new Date(date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function setSyncStatus(status) {
  const dot = document.getElementById('sync-indicator');
  if (dot) dot.className = `sync-dot ${status}`;
}

function updateLastUpdated() {
  const el = document.getElementById('last-updated-ts');
  if (el && STATE.lastUpdated) {
    el.textContent = `Updated ${formatTime(STATE.lastUpdated)}`;
  }
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.remove('hidden');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => toast.classList.add('hidden'), 3500);
}

async function copyText(text, successMsg) {
  try {
    await navigator.clipboard.writeText(text);
    showToast(successMsg || '✓ Copied!');
  } catch {
    // Fallback
    const el = document.createElement('textarea');
    el.value = text; el.style.position = 'fixed'; el.style.opacity = '0';
    document.body.appendChild(el); el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    showToast(successMsg || '✓ Copied!');
  }
}

function sourceBadge(type) {
  const map = {
    competitor_signal: ['competitor', 'Competitor'],
    government_reg:    ['regulatory', 'Regulatory'],
    government_site:   ['threat',     'CISA/Gov'],
    research_paper:    ['research',   'Research'],
    conference:        ['conference', 'Conference'],
  };
  const [cls, label] = map[type] || ['gray', type || 'Unknown'];
  return `<span class="badge ${cls}">${label}</span>`;
}

function formatSourceType(type) {
  const map = {
    competitor_signal: 'Competitor Signal',
    government_reg:    'Government Regulation',
    government_site:   'CISA / Gov Site',
    research_paper:    'Research Paper',
    conference:        'Conference / Event',
  };
  return map[type] || ucFirst((type || '').replace(/_/g, ' '));
}

// Expose globals for HTML onclick handlers
window.navigate        = navigate;
window.loadAllData     = loadAllData;
window.openSignalModal = openSignalModal;
window.closeModal      = closeModal;
window.copyText        = copyText;
window.triggerWorkflow = triggerWorkflow;
window.renderSignalsList = renderSignalsList;
window.updateFilterChips = updateFilterChips;
window.STATE           = STATE;
