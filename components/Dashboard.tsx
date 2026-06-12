'use client';

import { useState, useMemo } from 'react';
import {
  Database, AlertCircle, CheckCircle, XCircle, Play,
  ChevronRight, LayoutDashboard, Globe, Calendar,
  Search, X, Copy, Check, ExternalLink, Activity, FileText, ListTodo, RotateCw
} from 'lucide-react';
import clsx from 'clsx';

type TabType = 'overview' | 'signals' | 'briefs' | 'queue' | 'run';
type SignalSubTab = 'live' | 'errors' | 'rejected';
type QueueSubTab = 'queue' | 'w2Errors';

// ── FIELD EXTRACTOR ───────────────────────────────────────────────────────────
function getCardFields(row: Record<string, string>, relevanceMap?: Map<string, string>) {
  const title = row.title || row.signal_title || row.brief_title || row.name || '';
  let rawScore = row.relevance_score || '';
  if (!rawScore && relevanceMap && title) {
    rawScore = relevanceMap.get(title.toLowerCase().trim()) || '';
  }
  let cleanScore = '';
  if (rawScore) {
    const num = parseFloat(rawScore);
    cleanScore = isNaN(num) ? rawScore : String(num);
  }

  return {
    title,
    summary:         row.summary || row.signal_summary || row.brief_summary || row.description || row.content || '',
    urgency:         (row.urgency || '').toLowerCase(),
    sourceType:      row.source_type || row.type || row.signal_type || row.category || '',
    region:          row.region || row.affected_region || '',
    date:            row.pub_date || row.date || row.published_date || row.created_at || row.queued_at || row.approved_date || '',
    relevanceScore:  cleanScore,
    persona:         row.affected_persona || row.affected_person || row.persona || row.target_persona || '',
    url:             row.url || row.link || '',
    personaGuidance: row.persona_guidance || row.guidance || row.recommendation || '',
    clusterTopic:    row.cluster_topic || row.topic || '',
  };
}

// ── SIGNAL CARD ───────────────────────────────────────────────────────────────
const SignalCard = ({
  row, index, onClick, relevanceMap,
}: {
  row: Record<string, string>;
  index: number;
  onClick: (row: Record<string, string>) => void;
  relevanceMap?: Map<string, string>;
}) => {
  const f = getCardFields(row, relevanceMap);
  const displayTitle = f.title || `Entry ${index + 1}`;

  const urgencyStyle =
    f.urgency === 'high'                          ? 'bg-red-500/10 text-red-400 border-red-500/20' :
    f.urgency === 'medium' || f.urgency === 'med' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
    f.urgency === 'low'                           ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
    'bg-slate-500/10 text-slate-400 border-slate-500/20';

  return (
    <div
      onClick={() => onClick(row)}
      className="group flex flex-col gap-3.5 p-5 rounded-2xl border border-white/[0.04] bg-[#0c0d1e]/40 hover:bg-[#0c0d1e]/80 hover:border-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/5 cursor-pointer transition-all duration-200"
    >
      {/* Top: badges + score */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {f.urgency && (
            <span className={clsx('text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border', urgencyStyle)}>
              {f.urgency.toUpperCase()}
            </span>
          )}
          {f.sourceType && (
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border border-indigo-400/20 bg-indigo-400/5 text-indigo-300">
              {f.sourceType.replace(/_/g, ' ')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-300 text-xs font-bold font-mono">
            {f.relevanceScore || '-'}
          </div>
        </div>
      </div>

      {/* Title */}
      <h3 className="text-sm font-semibold text-white leading-snug line-clamp-2 group-hover:text-indigo-300 transition-colors">
        {displayTitle}
      </h3>

      {/* Summary preview */}
      {f.summary && (
        <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">{f.summary}</p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-auto pt-3 border-t border-white/[0.04]">
        <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap">
          {f.region && (
            <span className="flex items-center gap-1"><Globe className="w-3 h-3" />{f.region}</span>
          )}
          {f.date && (
            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{f.date}</span>
          )}
          {f.clusterTopic && (
            <span className="text-indigo-400/60 font-medium truncate max-w-[120px]">{f.clusterTopic}</span>
          )}
        </div>
        <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all duration-200 flex-shrink-0" />
      </div>
    </div>
  );
};

// ── DETAIL MODAL ──────────────────────────────────────────────────────────────
const DetailModal = ({ row, onClose, relevanceMap }: { row: Record<string, string>; onClose: () => void; relevanceMap?: Map<string, string> }) => {
  const f = getCardFields(row, relevanceMap);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const text = Object.entries(row).map(([k, v]) => `${k}: ${v}`).join('\n');
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const urgencyStyle =
    f.urgency === 'high'                          ? 'bg-red-500/10 text-red-400 border-red-500/20' :
    f.urgency === 'medium' || f.urgency === 'med' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
    f.urgency === 'low'                           ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
    'bg-slate-500/10 text-slate-400 border-slate-500/20';

  const dotColor =
    f.urgency === 'high'                          ? 'bg-red-400' :
    f.urgency === 'medium' || f.urgency === 'med' ? 'bg-amber-400' :
    f.urgency === 'low'                           ? 'bg-emerald-400' :
    'bg-slate-400';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="relative bg-[#0d0d1e] border border-white/[0.08] rounded-3xl w-full max-w-xl max-h-[85vh] flex flex-col shadow-[0_24px_80px_rgba(0,0,0,0.85)] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] bg-[#0d0d1e] flex-shrink-0">
          {f.urgency ? (
            <span className={clsx('inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-bold uppercase tracking-wider', urgencyStyle)}>
              <span className={clsx('w-1.5 h-1.5 rounded-full', dotColor)} />
              {f.urgency.toUpperCase()} URGENCY
            </span>
          ) : <span />}

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer',
                copied
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                  : 'border-white/10 bg-white/5 text-slate-400 hover:text-white hover:border-white/20'
              )}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            {f.url && (
              <a
                href={f.url} target="_blank" rel="noreferrer"
                onClick={e => e.stopPropagation()}
                className="flex items-center justify-center w-8 h-8 rounded-lg border border-white/10 bg-white/5 text-slate-400 hover:text-indigo-400 transition-all"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            <button
              onClick={onClose}
              className="flex items-center justify-center w-8 h-8 rounded-full border border-white/10 bg-white/5 text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto drawer-scrollbar px-6 py-6 space-y-6">
          {/* Title */}
          {f.title && <h2 className="text-lg font-bold text-white leading-snug">{f.title}</h2>}

          {/* Summary */}
          {f.summary && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400/80 mb-2">SUMMARY</p>
              <p className="text-sm text-slate-300 leading-relaxed">{f.summary}</p>
            </div>
          )}

          {/* Persona Guidance */}
          {f.personaGuidance && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400/80 mb-2">PERSONA GUIDANCE</p>
              <div className="border-l-4 border-indigo-500/60 bg-indigo-500/[0.03] px-4 py-3 rounded-r-xl">
                <p className="text-sm text-slate-200 leading-relaxed font-medium">{f.personaGuidance}</p>
              </div>
            </div>
          )}

          {/* Details grid */}
          <div className="space-y-2.5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400/80 mb-2">SIGNAL DETAILS</p>
            <div className="grid grid-cols-2 gap-2.5">
              {Object.entries(row)
                .filter(([k, v]) => {
                  const keyLower = k.toLowerCase();
                  const skipKeys = new Set([
                    'title', 'signal_title', 'brief_title', 'name',
                    'summary', 'brief_summary', 'description', 'content',
                    'persona_guidance', 'guidance', 'recommendation',
                    'url', 'link'
                  ]);
                  return !skipKeys.has(keyLower) && v !== undefined && v !== null && v.trim() !== '';
                })
                .map(([key, val]) => {
                  const isLongVal = val.length > 40 || key.toLowerCase().includes('reason') || key.toLowerCase().includes('message') || key.toLowerCase().includes('error') || key.toLowerCase().includes('persona') || key.toLowerCase().includes('guidance');
                  return (
                    <div
                      key={key}
                      className={clsx(
                        "bg-white/[0.02] border border-white/[0.05] rounded-xl px-4 py-3",
                        isLongVal ? "col-span-2" : "col-span-1"
                      )}
                    >
                      <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">
                        {key.replace(/_/g, ' ')}
                      </p>
                      <p className="text-sm font-semibold text-slate-200 mt-1 break-words">
                        {val}
                      </p>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── CARD GRID (search + filter + cards) ──────────────────────────────────────
const CardGrid = ({ data, relevanceMap }: { data: Record<string, string>[]; relevanceMap?: Map<string, string> }) => {
  const [search, setSearch] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selected, setSelected] = useState<Record<string, string> | null>(null);

  const sorted = useMemo(() => {
    return [...(data || [])].sort((a, b) => {
      const scoreA = Number(a.relevance_score || 0);
      const scoreB = Number(b.relevance_score || 0);
      if (scoreA !== scoreB) return scoreB - scoreA;
      const w = (u: string) => ({ high: 3, medium: 2, med: 2, low: 1 }[(u || '').toLowerCase()] || 0);
      return w(b.urgency) - w(a.urgency);
    });
  }, [data]);

  const filtered = useMemo(() => {
    let items = sorted;
    if (urgencyFilter !== 'all') {
      items = items.filter(r => (r.urgency || '').toLowerCase() === urgencyFilter);
    }
    if (typeFilter !== 'all') {
      items = items.filter(r => {
        const typeStr = (r.source_type || r.type || r.signal_type || r.category || '').toLowerCase();
        if (typeFilter === 'competitor') return typeStr.includes('competitor');
        if (typeFilter === 'regulatory') return typeStr.includes('reg') || typeStr.includes('compliance');
        if (typeFilter === 'cisa') return typeStr.includes('gov') || typeStr.includes('cisa') || typeStr.includes('site');
        if (typeFilter === 'research') return typeStr.includes('research') || typeStr.includes('paper');
        if (typeFilter === 'events') return typeStr.includes('event') || typeStr.includes('news');
        return true;
      });
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(r => Object.values(r).some(v => v?.toLowerCase().includes(q)));
    }
    return items;
  }, [sorted, urgencyFilter, typeFilter, search]);

  const urgencyPills = [
    { value: 'all',    label: 'All Urgency' },
    { value: 'high',   label: 'High' },
    { value: 'medium', label: 'Medium' },
    { value: 'low',    label: 'Low' },
  ];

  const typePills = [
    { value: 'all',        label: 'All Types' },
    { value: 'competitor', label: 'Competitor' },
    { value: 'regulatory', label: 'Regulatory' },
    { value: 'cisa',       label: 'CISA/Gov' },
    { value: 'research',   label: 'Research' },
    { value: 'events',     label: 'Events' },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
        <input
          type="text"
          placeholder="Search signals, summaries..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-[#0d0d1e] border border-white/[0.06] rounded-2xl pl-10 pr-10 py-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/40 focus:bg-[#0c0d1e] transition-all"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Urgency filter pills */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {urgencyPills.map(({ value, label }) => {
          const isActive = urgencyFilter === value;
          return (
            <button
              key={value}
              onClick={() => setUrgencyFilter(value)}
              className={clsx(
                'px-4 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer',
                isActive
                  ? 'border-indigo-500/50 bg-indigo-500/10 text-indigo-300 shadow-[0_0_12px_rgba(99,102,241,0.15)]'
                  : 'border-white/5 bg-[#0f1023]/60 text-slate-400 hover:border-white/10 hover:text-slate-200'
              )}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Type filter pills */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {typePills.map(({ value, label }) => {
          const isActive = typeFilter === value;
          return (
            <button
              key={value}
              onClick={() => setTypeFilter(value)}
              className={clsx(
                'px-4 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer',
                isActive
                  ? 'border-indigo-500/50 bg-indigo-500/10 text-indigo-300 shadow-[0_0_12px_rgba(99,102,241,0.15)]'
                  : 'border-white/5 bg-[#0f1023]/60 text-slate-400 hover:border-white/10 hover:text-slate-200'
              )}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Result count */}
      <p className="text-xs text-slate-500 mt-1 font-medium">{filtered.length} of {data.length} signals</p>

      {/* 2-column card grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 pb-24">
        {filtered.map((row, i) => (
          <SignalCard key={i} row={row} index={i} onClick={setSelected} relevanceMap={relevanceMap} />
        ))}
        {filtered.length === 0 && (
          <div className="col-span-2 text-center py-20 text-slate-500 text-sm">
            No signals match your filters.
          </div>
        )}
      </div>

      {/* Detail modal */}
      {selected && <DetailModal row={selected} onClose={() => setSelected(null)} relevanceMap={relevanceMap} />}
    </div>
  );
};

// ── MAIN DASHBOARD ────────────────────────────────────────────────────────────
export default function Dashboard({ initialData }: { initialData: any }) {
  const [activeTab, setActiveTab] = useState<TabType>('signals');
  const [signalSub, setSignalSub] = useState<SignalSubTab>('live');
  const [queueSub, setQueueSub] = useState<QueueSubTab>('queue');
  const [runningStage, setRunningStage] = useState<number | null>(null);

  const relevanceMap = useMemo(() => {
    const map = new Map<string, string>();
    initialData?.stage1?.forEach((r: any) => {
      const title = r.title || r.signal_title || '';
      if (title && r.relevance_score) {
        map.set(title.toLowerCase().trim(), String(r.relevance_score));
      }
    });
    initialData?.approvedBriefs?.forEach((r: any) => {
      const title = r.title || r.signal_title || '';
      if (title && r.relevance_score) {
        map.set(title.toLowerCase().trim(), String(r.relevance_score));
      }
    });
    return map;
  }, [initialData]);

  const triggerWorkflow = async (stage: number) => {
    setRunningStage(stage);
    try {
      const res = await fetch('/api/workflows/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert(`Stage ${stage} workflow triggered successfully!`);
      } else {
        alert(`Failed to trigger Stage ${stage}: ${data.error || 'Unknown error'}`);
      }
    } catch {
      alert(`Error triggering stage ${stage}`);
    } finally {
      setRunningStage(null);
    }
  };

  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'signals',  label: 'Signals',  icon: Activity },
    { id: 'briefs',   label: 'Briefs',   icon: FileText },
    { id: 'queue',    label: 'Queue',    icon: ListTodo },
    { id: 'run',      label: 'Run',      icon: Play },
  ] as const;

  // Compute active data set based on active tab and sub-tab selection
  const activeData: Record<string, string>[] = useMemo(() => {
    if (activeTab === 'briefs') return initialData?.approvedBriefs || [];
    if (activeTab === 'signals') {
      if (signalSub === 'errors') return initialData?.errors || [];
      if (signalSub === 'rejected') return initialData?.rejectedSignals || [];
      return initialData?.stage1 || [];
    }
    if (activeTab === 'queue') {
      if (queueSub === 'w2Errors') return initialData?.w2Errors || [];
      return initialData?.stage3Queue || [];
    }
    return [];
  }, [activeTab, signalSub, queueSub, initialData]);

  return (
    <div className="min-h-screen bg-[#070711] text-[#e2e8f0] flex flex-col font-sans antialiased">
      {/* Top Header */}
      <header className="flex justify-between items-center px-4 md:px-8 py-4 bg-[#070711] border-b border-white/[0.04] sticky top-0 z-40 backdrop-blur-md bg-opacity-95">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-lg shadow-[0_0_15px_rgba(99,102,241,0.2)]">
            C
          </div>
          <div>
            <h1 className="font-bold text-sm text-white tracking-tight leading-none">Contrails AI</h1>
            <p className="text-[10px] text-indigo-400 font-semibold tracking-wider uppercase mt-1">GTM Signals</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => window.location.reload()}
            className="w-8 h-8 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:border-white/20 transition-all cursor-pointer"
            title="Refresh dashboard data"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
          <span className="flex items-center gap-2 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Active
          </span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 md:px-8 py-6">
        
        {/* Sub-Tab Navigation for Signals/Queue */}
        {activeTab === 'signals' && (
          <div className="flex border-b border-white/[0.04] mb-5">
            {[
              { id: 'live', label: 'Stage 1 Signals' },
              { id: 'errors', label: 'W1 Errors' },
              { id: 'rejected', label: 'Rejected Signals' },
            ].map(sub => (
              <button
                key={sub.id}
                onClick={() => setSignalSub(sub.id as SignalSubTab)}
                className={clsx(
                  'px-4 py-2 text-xs font-semibold border-b-2 -mb-[2px] transition-colors cursor-pointer',
                  signalSub === sub.id
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-slate-500 hover:text-slate-300'
                )}
              >
                {sub.label}
              </button>
            ))}
          </div>
        )}

        {activeTab === 'queue' && (
          <div className="flex border-b border-white/[0.04] mb-5">
            {[
              { id: 'queue', label: 'Stage 3 Queue' },
              { id: 'w2Errors', label: 'W2 Errors' },
            ].map(sub => (
              <button
                key={sub.id}
                onClick={() => setQueueSub(sub.id as QueueSubTab)}
                className={clsx(
                  'px-4 py-2 text-xs font-semibold border-b-2 -mb-[2px] transition-colors cursor-pointer',
                  queueSub === sub.id
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-slate-500 hover:text-slate-300'
                )}
              >
                {sub.label}
              </button>
            ))}
          </div>
        )}

        {/* tab panes */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-fade-in pb-20">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Signals',   value: initialData.stage1?.length || 0,        color: 'text-indigo-400 border-indigo-500/20 bg-indigo-500/5' },
                { label: 'Approved Briefs', value: initialData.approvedBriefs?.length || 0, color: 'text-purple-400 border-purple-500/20 bg-purple-500/5' },
                { label: 'Queue',           value: initialData.stage3Queue?.length || 0,    color: 'text-amber-400 border-amber-500/20 bg-amber-500/5' },
                { label: 'Errors',          value: (initialData.errors?.length || 0) + (initialData.w2Errors?.length || 0), color: 'text-red-400 border-red-500/20 bg-red-500/5' },
              ].map((s, i) => (
                <div key={i} className={clsx('p-4 border rounded-2xl flex flex-col justify-between h-24', s.color)}>
                  <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">{s.label}</span>
                  <span className="text-2xl font-bold font-mono">{s.value}</span>
                </div>
              ))}
            </div>

            {/* Quick overview welcome */}
            <div className="border border-white/[0.04] bg-[#0c0d1e]/40 p-6 rounded-2xl">
              <h2 className="text-base font-bold text-white mb-2">Welcome to GTM Command Center</h2>
              <p className="text-xs text-slate-400 leading-relaxed max-w-xl">
                This dashboard tracks inbound signals and scrapes relevant papers, triggers scoring algorithms, builds narratives, and posts them to your marketing queues.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'run' && (
          <div className="space-y-5 pb-20 animate-fade-in">
            <h2 className="text-base font-bold text-white mb-4">Run Pipelines & Workflows</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map(stage => (
                <div key={stage} className="flex flex-col border border-white/[0.06] bg-[#0c0d1e]/40 p-5 rounded-2xl">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center mb-4 text-indigo-400 font-bold text-sm">
                    {stage}
                  </div>
                  <h4 className="font-bold text-sm mb-1 text-white">Stage {stage}</h4>
                  <p className="text-xs text-slate-500 mb-6 h-8">
                    {stage === 1 ? 'Scrape signals & papers' : stage === 2 ? 'Generate briefs & score' : 'Create narratives & posts'}
                  </p>
                  <button
                    onClick={() => triggerWorkflow(stage)}
                    disabled={runningStage !== null}
                    className={clsx(
                      'w-full py-2 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer',
                      runningStage === stage
                        ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                        : 'bg-indigo-500 text-white hover:bg-indigo-600 shadow-[0_0_15px_rgba(99,102,241,0.3)]'
                    )}
                  >
                    {runningStage === stage
                      ? <span className="flex items-center gap-2"><span className="animate-spin">⍥</span> Running...</span>
                      : <>Run Workflow <ChevronRight className="w-3.5 h-3.5" /></>
                    }
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {(activeTab === 'signals' || activeTab === 'briefs' || activeTab === 'queue') && (
          <div className="animate-fade-in">
            <CardGrid data={activeData} relevanceMap={relevanceMap} />
          </div>
        )}

      </main>

      {/* Sticky Bottom Tab Bar Navigation */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 bg-[#070711]/90 backdrop-blur-lg border-t border-white/[0.06] safe-bottom">
        <div className="max-w-md mx-auto flex justify-around items-center h-16 px-4">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className="flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all cursor-pointer"
              >
                <Icon className={clsx('w-5 h-5 transition-transform duration-200', isActive ? 'text-indigo-400 scale-110' : 'text-slate-500 hover:text-slate-300')} />
                <span className={clsx('text-[9px] mt-1 font-semibold tracking-wider transition-colors', isActive ? 'text-indigo-400 font-bold' : 'text-slate-500')}>{item.label}</span>
              </button>
            );
          })}
        </div>
      </footer>
    </div>
  );
}
