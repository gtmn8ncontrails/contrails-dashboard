'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Database, AlertCircle, CheckCircle, XCircle, Play,
  ChevronRight, LayoutDashboard, Globe, Calendar,
  Search, X, Copy, Check, ExternalLink, Activity, FileText, ListTodo, RotateCw, FileCheck,
  MoreHorizontal, Trash2, RefreshCcw
} from 'lucide-react';
import clsx from 'clsx';

type TabType = 'overview' | 'finalAssets' | 'signals' | 'briefs' | 'queue' | 'run';
type SignalSubTab = 'live' | 'errors' | 'rejected';
type QueueSubTab = 'recentlyDeleted' | 'w1Errors' | 'w2Errors' | 'rejectedSignals' | 'approvedBriefs';

// Each deleted entry tracks which "bucket" it came from so we can restore it
type DeletedEntry = {
  row: Record<string, string>;
  sourceKey: 'stage1' | 'approvedBriefs' | 'stage3Queue' | 'stage3Output' | 'rejectedSignals' | 'errors' | 'w2Errors';
  deletedAt: number;
};

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

function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    return dateStr;
  }
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

// ── THREE-DOT MENU ─────────────────────────────────────────────────────────────
const ThreeDotsMenu = ({
  onAction,
  actionLabel,
  actionIcon: ActionIcon,
  actionClass,
}: {
  onAction: () => void;
  actionLabel: string;
  actionIcon: React.ElementType;
  actionClass: string;
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative" onClick={e => e.stopPropagation()}>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center justify-center w-7 h-7 rounded-lg border border-white/[0.08] bg-white/[0.03] text-slate-500 hover:text-slate-200 hover:border-white/20 hover:bg-white/[0.06] transition-all cursor-pointer"
        title="More options"
      >
        <MoreHorizontal className="w-3.5 h-3.5" />
      </button>
      {open && (
        <div className="absolute right-0 top-9 z-50 min-w-[130px] bg-[#111226] border border-white/[0.1] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.6)] overflow-hidden py-1">
          <button
            onClick={() => { onAction(); setOpen(false); }}
            className={clsx(
              'w-full flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold transition-all cursor-pointer',
              actionClass
            )}
          >
            <ActionIcon className="w-3.5 h-3.5 flex-shrink-0" />
            {actionLabel}
          </button>
        </div>
      )}
    </div>
  );
};

// ── SIGNAL CARD ───────────────────────────────────────────────────────────────
const SignalCard = ({
  row, index, onClick, relevanceMap, isDeleted,
}: {
  row: Record<string, string>;
  index: number;
  onClick: (row: Record<string, string>) => void;
  relevanceMap?: Map<string, string>;
  isDeleted?: boolean;
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
      className={clsx(
        "group flex flex-col gap-3.5 p-5 rounded-2xl border cursor-pointer transition-all duration-200",
        isDeleted
          ? "border-white/[0.04] bg-red-900/5 hover:bg-red-900/10 hover:border-red-500/20 opacity-75"
          : "border-white/[0.04] bg-[#0c0d1e]/40 hover:bg-[#0c0d1e]/80 hover:border-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/5"
      )}
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
          {isDeleted && (
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border border-red-400/20 bg-red-400/5 text-red-300">
              Deleted
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
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
            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDisplayDate(f.date)}</span>
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

// ── COPY BUTTON & DETAIL BOX HELPERS ──────────────────────────────────────────
const CopyButton = ({ text, tooltip, className }: { text: string; tooltip?: string; className?: string }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
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
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      onClick={handleCopy}
      className={clsx("p-1 rounded hover:bg-white/5 text-slate-500 hover:text-white transition-all cursor-pointer flex items-center justify-center", className)}
      title={tooltip || "Copy text"}
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
};

const DetailBox = ({ label, value, isLong }: { label: string; value: string; isLong: boolean }) => {
  return (
    <div
      className={clsx(
        "relative bg-white/[0.02] border border-white/[0.05] rounded-xl px-4 py-3 group/box transition-all hover:border-white/[0.08] hover:bg-white/[0.03]",
        isLong ? "col-span-2" : "col-span-1"
      )}
    >
      <CopyButton
        text={value}
        tooltip={`Copy ${label}`}
        className="absolute top-2.5 right-2.5 opacity-0 group-hover/box:opacity-100 transition-opacity"
      />
      <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 pr-6 select-none">
        {label}
      </p>
      <p className="text-sm font-semibold text-slate-200 mt-1 break-words pr-6 whitespace-pre-wrap">
        {value}
      </p>
    </div>
  );
};

// ── DETAIL MODAL ──────────────────────────────────────────────────────────────
// ── DETAIL MODAL ──────────────────────────────────────────────────────────────
const DetailModal = ({
  row,
  onClose,
  relevanceMap,
  advanced,
  onDelete,
  onRestore,
  isDeleted,
}: {
  row: Record<string, string>;
  onClose: () => void;
  relevanceMap?: Map<string, string>;
  advanced: boolean;
  onDelete?: (row: Record<string, string>) => void;
  onRestore?: (row: Record<string, string>) => void;
  isDeleted?: boolean;
}) => {
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

  // Helper to retrieve row values case-insensitively with underscores/spaces normalized
  const getRowValue = (keys: string[]) => {
    for (const [k, v] of Object.entries(row)) {
      const norm = k.toLowerCase().replace(/_/g, ' ').trim();
      if (keys.includes(norm)) {
        return v;
      }
    }
    return '';
  };

  const xPost = getRowValue(['x post', 'x_post', 'twitter post', 'twitter_post', 'x/twitter post']);
  const linkedinPost = getRowValue(['linkedin post', 'linkedin_post', 'linkedin version', 'linkedin_version']);
  const whatsappMessage = getRowValue(['whatsapp message', 'whatsapp_message']);
  const linkedinDm = getRowValue(['linkedin dm', 'linkedin_dm']);

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
            {(onDelete || onRestore) && (
              <ThreeDotsMenu
                onAction={() => {
                  if (isDeleted) {
                    onRestore?.(row);
                  } else {
                    onDelete?.(row);
                  }
                  onClose();
                }}
                actionLabel={isDeleted ? 'Restore' : 'Delete'}
                actionIcon={isDeleted ? RefreshCcw : Trash2}
                actionClass={isDeleted
                  ? 'text-emerald-400 hover:bg-emerald-500/10'
                  : 'text-red-400 hover:bg-red-500/10'
                }
              />
            )}
            {f.url && (
              <a
                href={f.url} target="_blank" rel="noreferrer"
                onClick={e => e.stopPropagation()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-xs font-semibold text-slate-400 hover:text-indigo-400 hover:border-indigo-500/25 transition-all cursor-pointer"
              >
                <span>Link</span>
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
            <div className="relative group/summary">
              <div className="flex justify-between items-center mb-2 select-none">
                <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400/80">SUMMARY</p>
                <CopyButton
                  text={f.summary}
                  tooltip="Copy Summary"
                  className="opacity-0 group-hover/summary:opacity-100 transition-opacity"
                />
              </div>
              <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{f.summary}</p>
            </div>
          )}

          {/* Persona Guidance */}
          {f.personaGuidance && (
            <div className="relative group/guidance">
              <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400/80 mb-2 select-none">PERSONA GUIDANCE</p>
              <div className="relative border-l-4 border-indigo-500/60 bg-indigo-500/[0.03] px-4 py-3 rounded-r-xl group/guidance-box transition-all hover:bg-indigo-500/[0.05]">
                <CopyButton
                  text={f.personaGuidance}
                  tooltip="Copy Guidance"
                  className="absolute top-2.5 right-2.5 opacity-0 group-hover/guidance-box:opacity-100 transition-opacity"
                />
                <p className="text-sm text-slate-200 leading-relaxed font-medium pr-6 whitespace-pre-wrap">{f.personaGuidance}</p>
              </div>
            </div>
          )}

          {/* Details grid */}
          <div className="space-y-2.5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400/80 mb-2 select-none">SIGNAL DETAILS</p>
            <div className="grid grid-cols-2 gap-2.5">
              {!advanced ? (
                <>
                  {xPost && (
                    <DetailBox
                      key="x_post"
                      label="x post"
                      value={xPost}
                      isLong={true}
                    />
                  )}
                  {linkedinPost && (
                    <DetailBox
                      key="linkedin_post"
                      label="linkedin post"
                      value={linkedinPost}
                      isLong={true}
                    />
                  )}
                  {whatsappMessage && (
                    <DetailBox
                      key="whatsapp_message"
                      label="whatsapp message"
                      value={whatsappMessage}
                      isLong={true}
                    />
                  )}
                  {linkedinDm && (
                    <DetailBox
                      key="linkedin_dm"
                      label="linkedin dm"
                      value={linkedinDm}
                      isLong={true}
                    />
                  )}
                </>
              ) : (
                Object.entries(row)
                  .filter(([k, v]) => {
                    return v !== undefined && v !== null && v.trim() !== '';
                  })
                  .map(([key, val]) => {
                    const isLongVal = val.length > 40 || key.toLowerCase().includes('reason') || key.toLowerCase().includes('message') || key.toLowerCase().includes('error') || key.toLowerCase().includes('persona') || key.toLowerCase().includes('guidance') || key.toLowerCase().includes('pain') || key.toLowerCase().includes('url');
                    return (
                      <DetailBox
                        key={key}
                        label={key.replace(/_/g, ' ')}
                        value={val}
                        isLong={isLongVal}
                      />
                    );
                  })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── CARD GRID (search + filter + cards) ──────────────────────────────────────
const CardGrid = ({
  data,
  relevanceMap,
  onDelete,
  isDeletedView,
  onRestore,
  advanced,
}: {
  data: Record<string, string>[];
  relevanceMap?: Map<string, string>;
  onDelete?: (row: Record<string, string>) => void;
  isDeletedView?: boolean;
  onRestore?: (row: Record<string, string>) => void;
  advanced: boolean;
}) => {
  const [search, setSearch] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortFilter, setSortFilter] = useState<'score' | 'recent'>('score');
  const [selected, setSelected] = useState<Record<string, string> | null>(null);

  const sorted = useMemo(() => {
    const itemsWithMeta = [...(data || [])].map((row, idx) => {
      const fields = getCardFields(row, relevanceMap);
      return { row, idx, date: fields.date, score: Number(fields.relevanceScore || 0), urgency: fields.urgency };
    });
    
    return itemsWithMeta.sort((a, b) => {
      if (sortFilter === 'recent') {
         const dateObjA = new Date(a.date);
         const dateObjB = new Date(b.date);
         const timeA = !isNaN(dateObjA.getTime()) ? new Date(dateObjA.getFullYear(), dateObjA.getMonth(), dateObjA.getDate()).getTime() : 0;
         const timeB = !isNaN(dateObjB.getTime()) ? new Date(dateObjB.getFullYear(), dateObjB.getMonth(), dateObjB.getDate()).getTime() : 0;
         
         if (timeA !== timeB) {
             return timeB - timeA;
         }
         
         if (a.score !== b.score) return b.score - a.score;
         const w = (u: string) => ({ high: 3, medium: 2, med: 2, low: 1 }[(u || '').toLowerCase()] || 0);
         const urgencyDiff = w(b.urgency) - w(a.urgency);
         if (urgencyDiff !== 0) return urgencyDiff;
         return b.idx - a.idx;
      } else {
         if (a.score !== b.score) return b.score - a.score;
         const w = (u: string) => ({ high: 3, medium: 2, med: 2, low: 1 }[u] || 0);
         return w(b.urgency) - w(a.urgency);
      }
    }).map(item => item.row);
  }, [data, sortFilter, relevanceMap]);

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

      {/* Sort pills */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {[
          { value: 'score', label: 'Top Score' },
          { value: 'recent', label: 'Most Recent' },
        ].map(({ value, label }) => {
          const isActive = sortFilter === value;
          return (
            <button
              key={value}
              onClick={() => setSortFilter(value as 'score' | 'recent')}
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
      <p className="text-xs text-slate-500 mt-1 font-medium">{filtered.length} of {data.length} {isDeletedView ? 'deleted entries' : 'signals'}</p>

      {/* 2-column card grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 pb-24">
        {filtered.map((row, i) => (
          <SignalCard
            key={i}
            row={row}
            index={i}
            onClick={setSelected}
            relevanceMap={relevanceMap}
            isDeleted={isDeletedView}
          />
        ))}
        {filtered.length === 0 && (
          <div className="col-span-2 text-center py-20 text-slate-500 text-sm">
            {isDeletedView ? 'No recently deleted entries.' : 'No signals match your filters.'}
          </div>
        )}
      </div>

      {/* Detail modal */}
      {selected && (
        <DetailModal
          row={selected}
          onClose={() => setSelected(null)}
          relevanceMap={relevanceMap}
          advanced={advanced}
          onDelete={onDelete}
          onRestore={onRestore}
          isDeleted={isDeletedView}
        />
      )}
    </div>
  );
};

// ── MAIN DASHBOARD ────────────────────────────────────────────────────────────
export default function Dashboard({ initialData, initialDeleted }: { initialData: any; initialDeleted?: DeletedEntry[] }) {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [signalSub, setSignalSub] = useState<SignalSubTab>('live');
  const [queueSub, setQueueSub] = useState<QueueSubTab>('recentlyDeleted');
  const [runningStage, setRunningStage] = useState<number | null>(null);
  const [advanced, setAdvanced] = useState(false);
  const [selectedDeleted, setSelectedDeleted] = useState<DeletedEntry | null>(null);

  // Local mutable data state – initialized from server data, updated on delete/restore
  const [localStage1, setLocalStage1] = useState<Record<string, string>[]>([]);
  const [localApprovedBriefs, setLocalApprovedBriefs] = useState<Record<string, string>[]>([]);
  const [localStage3Queue, setLocalStage3Queue] = useState<Record<string, string>[]>([]);
  const [localStage3Output, setLocalStage3Output] = useState<Record<string, string>[]>([]);
  const [localRejectedSignals, setLocalRejectedSignals] = useState<Record<string, string>[]>([]);
  const [localErrors, setLocalErrors] = useState<Record<string, string>[]>([]);
  const [localW2Errors, setLocalW2Errors] = useState<Record<string, string>[]>([]);
  const [deletedEntries, setDeletedEntries] = useState<DeletedEntry[]>(initialDeleted || []);

  // Reset queue sub-tab to recently deleted if advanced is toggled off
  useEffect(() => {
    if (!advanced && activeTab === 'queue' && queueSub !== 'recentlyDeleted') {
      setQueueSub('recentlyDeleted');
    }
  }, [advanced, activeTab, queueSub]);

  useEffect(() => {
    setLocalStage1(initialData?.stage1 || []);
    setLocalApprovedBriefs(initialData?.approvedBriefs || []);
    setLocalStage3Queue(initialData?.stage3Queue || []);
    setLocalStage3Output(initialData?.stage3Output || []);
    setLocalRejectedSignals(initialData?.rejectedSignals || []);
    setLocalErrors(initialData?.errors || []);
    setLocalW2Errors(initialData?.w2Errors || []);
    if (initialDeleted) {
      setDeletedEntries(initialDeleted);
    }
  }, [initialData, initialDeleted]);

  const relevanceMap = useMemo(() => {
    const map = new Map<string, string>();
    localStage1.forEach((r: any) => {
      const title = r.title || r.signal_title || '';
      if (title && r.relevance_score) {
        map.set(title.toLowerCase().trim(), String(r.relevance_score));
      }
    });
    localApprovedBriefs.forEach((r: any) => {
      const title = r.title || r.signal_title || '';
      if (title && r.relevance_score) {
        map.set(title.toLowerCase().trim(), String(r.relevance_score));
      }
    });
    return map;
  }, [localStage1, localApprovedBriefs]);

  // Delete an entry from its source list and add to recently deleted
  const handleDelete = (
    row: Record<string, string>,
    sourceKey: DeletedEntry['sourceKey'],
    setSource: React.Dispatch<React.SetStateAction<Record<string, string>[]>>
  ) => {
    setSource(prev => prev.filter(r => r !== row));
    const newEntry = { row, sourceKey, deletedAt: Date.now() };
    setDeletedEntries(prev => [newEntry, ...prev]);

    // Send action to API to persist the deletion
    fetch('/api/deleted', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', entry: newEntry }),
    }).catch(err => console.error('Error saving deletion:', err));
  };

  // Restore from recently deleted back to its source list
  const handleRestore = (entry: DeletedEntry) => {
    setDeletedEntries(prev => prev.filter(e => e !== entry));
    const setterMap: Record<DeletedEntry['sourceKey'], React.Dispatch<React.SetStateAction<Record<string, string>[]>>> = {
      stage1: setLocalStage1,
      approvedBriefs: setLocalApprovedBriefs,
      stage3Queue: setLocalStage3Queue,
      stage3Output: setLocalStage3Output,
      rejectedSignals: setLocalRejectedSignals,
      errors: setLocalErrors,
      w2Errors: setLocalW2Errors,
    };
    setterMap[entry.sourceKey](prev => [entry.row, ...prev]);

    // Send action to API to persist the restoration
    fetch('/api/deleted', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'restore', entry }),
    }).catch(err => console.error('Error restoring entry:', err));
  };

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
    { id: 'overview',    label: 'Overview',     icon: LayoutDashboard },
    { id: 'finalAssets', label: 'Final Assets', icon: FileCheck },
    { id: 'queue',       label: 'Errors',       icon: AlertCircle },
    { id: 'run',         label: 'Run',          icon: Play },
  ] as const;

  // Determine the active data and corresponding delete handler
  type ActiveDataConfig = {
    data: Record<string, string>[];
    sourceKey: DeletedEntry['sourceKey'];
    setter: React.Dispatch<React.SetStateAction<Record<string, string>[]>>;
  };

  const activeConfig: ActiveDataConfig | null = useMemo(() => {
    if (activeTab === 'finalAssets') return { data: localStage3Queue, sourceKey: 'stage3Queue', setter: setLocalStage3Queue };
    if (activeTab === 'queue') {
      if (queueSub === 'recentlyDeleted') return null;
      if (queueSub === 'w1Errors') return { data: localErrors, sourceKey: 'errors', setter: setLocalErrors };
      if (queueSub === 'w2Errors') return { data: localW2Errors, sourceKey: 'w2Errors', setter: setLocalW2Errors };
      if (queueSub === 'rejectedSignals') return { data: localRejectedSignals, sourceKey: 'rejectedSignals', setter: setLocalRejectedSignals };
      if (queueSub === 'approvedBriefs') return { data: localApprovedBriefs, sourceKey: 'approvedBriefs', setter: setLocalApprovedBriefs };
      return { data: [], sourceKey: 'stage3Queue', setter: setLocalStage3Queue };
    }
    return null;
  }, [activeTab, queueSub, localStage3Queue, localErrors, localW2Errors, localRejectedSignals, localApprovedBriefs]);

  const showCardGrid =
    activeTab === 'signals' ||
    activeTab === 'briefs' ||
    activeTab === 'finalAssets' ||
    (activeTab === 'queue' && queueSub !== 'recentlyDeleted');

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

        <div className="flex items-center gap-4">
          {/* Advanced toggle */}
          <div className="flex items-center gap-2 select-none">
            <span className="text-xs font-semibold text-slate-400">Advanced</span>
            <button
              onClick={() => setAdvanced(!advanced)}
              className={clsx(
                "relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer focus:outline-none",
                advanced ? "bg-indigo-500" : "bg-white/10"
              )}
            >
              <span
                className={clsx(
                  "inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform duration-200 ease-in-out",
                  advanced ? "translate-x-[18px]" : "translate-x-[2px]"
                )}
              />
            </button>
          </div>

          <span className="flex items-center gap-2 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Active
          </span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 md:px-8 py-6">
        
        {/* Sub-Tab Navigation for Errors */}
        {activeTab === 'queue' && (
          <div className="flex border-b border-white/[0.04] mb-5 overflow-x-auto overflow-y-hidden hide-scrollbar">
            {([
              { id: 'recentlyDeleted', label: `Recently Deleted${deletedEntries.length > 0 ? ` (${deletedEntries.length})` : ''}` },
              ...(advanced ? [
                { id: 'w1Errors', label: 'W1 Errors' },
                { id: 'w2Errors', label: 'W2 Errors' },
                { id: 'rejectedSignals', label: 'Rejected Signals' },
                { id: 'approvedBriefs', label: 'Approved Briefs' },
              ] : [])
            ] as const).map(sub => (
              <button
                key={sub.id}
                onClick={() => setQueueSub(sub.id as QueueSubTab)}
                className={clsx(
                  'px-4 py-2 text-xs font-semibold border-b-2 -mb-[2px] transition-colors cursor-pointer whitespace-nowrap',
                  queueSub === sub.id
                    ? sub.id === 'recentlyDeleted'
                      ? 'border-red-500 text-red-400'
                      : 'border-indigo-500 text-indigo-400'
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
            <div className="grid grid-cols-3 gap-2 md:gap-4">
              {[
                { label: 'Total Signals',   value: localStage1.length,        color: 'text-indigo-400 border-indigo-500/20 bg-indigo-500/5' },
                { label: 'Final Briefs',    value: localStage3Queue.length,   color: 'text-purple-400 border-purple-500/20 bg-purple-500/5' },
                { label: 'Errors',          value: localErrors.length + localW2Errors.length, color: 'text-red-400 border-red-500/20 bg-red-500/5' },
              ].map((s, i) => (
                <div key={i} className={clsx('p-3 border rounded-2xl flex flex-col justify-between h-20 md:h-24', s.color)}>
                  <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-wider opacity-80 leading-tight">{s.label}</span>
                  <span className="text-xl md:text-2xl font-bold font-mono">{s.value}</span>
                </div>
              ))}
            </div>

            {/* Quick overview welcome */}
            <div className="border border-white/[0.04] bg-[#0c0d1e]/40 p-6 rounded-2xl">
              <h2 className="text-base font-bold text-white mb-2">Welcome to GTM Command Center</h2>
              <p className="text-xs text-slate-400 leading-relaxed max-w-3xl">
                Automated competitive and regulatory intelligence for Contrails.ai. The pipeline scrapes competitor sites, academic research, and regulatory feeds, scores each signal for relevance and urgency, and turns the highest-priority ones into ready-to-use GTM assets — briefs, cold emails, and social content — queued for review.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'run' && (
          <div className="flex items-center justify-center min-h-[60vh] pb-20 animate-fade-in">
            <div className="w-full max-w-md border border-white/[0.06] bg-gradient-to-br from-[#0c0d1e]/80 to-[#111230]/60 p-8 rounded-3xl shadow-[0_8px_40px_rgba(99,102,241,0.08)] backdrop-blur-sm">
              {/* Icon */}
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/15 border border-indigo-500/25 flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(99,102,241,0.15)]">
                <Play className="w-6 h-6 text-indigo-400" />
              </div>

              <h2 className="text-lg font-bold text-white mb-2 tracking-tight">Execute Workflow</h2>
              <p className="text-sm text-slate-400 leading-relaxed mb-8">
                Scrape the latest signals, research papers, and competitor updates. Results will be processed and appear in your dashboard.
              </p>

              <button
                onClick={() => triggerWorkflow(1)}
                disabled={runningStage !== null}
                className={clsx(
                  'w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2.5 cursor-pointer',
                  runningStage === 1
                    ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 shadow-[0_0_20px_rgba(99,102,241,0.1)]'
                    : 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white hover:from-indigo-600 hover:to-indigo-700 shadow-[0_4px_20px_rgba(99,102,241,0.35)] hover:shadow-[0_4px_25px_rgba(99,102,241,0.5)]'
                )}
              >
                {runningStage === 1
                  ? <span className="flex items-center gap-2"><span className="animate-spin">⍥</span> Running...</span>
                  : <>Execute Workflow <ChevronRight className="w-4 h-4" /></>
                }
              </button>
            </div>
          </div>
        )}

        {/* Recently Deleted view */}
        {activeTab === 'queue' && queueSub === 'recentlyDeleted' && (
          <div className="animate-fade-in">
            {deletedEntries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-slate-500 gap-3">
                <Trash2 className="w-8 h-8 opacity-30" />
                <p className="text-sm font-medium">No recently deleted entries.</p>
                <p className="text-xs opacity-60">Items you delete will appear here and can be restored.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 pb-24">
                {deletedEntries.map((entry, i) => (
                  <SignalCard
                    key={i}
                    row={entry.row}
                    index={i}
                    onClick={() => setSelectedDeleted(entry)}
                    relevanceMap={relevanceMap}
                    isDeleted={true}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Regular card grid for signals, briefs, queue sub-tabs, finalAssets */}
        {showCardGrid && activeConfig && (
          <div className="animate-fade-in">
            <CardGrid
              data={activeConfig.data}
              relevanceMap={relevanceMap}
              onDelete={(row) => handleDelete(row, activeConfig.sourceKey, activeConfig.setter)}
              advanced={advanced}
            />
          </div>
        )}

        {selectedDeleted && (
          <DetailModal
            row={selectedDeleted.row}
            onClose={() => setSelectedDeleted(null)}
            relevanceMap={relevanceMap}
            advanced={advanced}
            onRestore={() => handleRestore(selectedDeleted)}
            isDeleted={true}
          />
        )}

      </main>

      {/* Sticky Bottom Tab Bar Navigation */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 bg-[#070711]/90 backdrop-blur-lg border-t border-white/[0.06] safe-bottom">
        <div className="max-w-md mx-auto flex justify-around items-center h-16 px-4">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            // Show badge on Queue tab if there are deleted entries
            const showBadge = false;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className="relative flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all cursor-pointer"
              >
                <Icon className={clsx('w-5 h-5 transition-transform duration-200', isActive ? 'text-indigo-400 scale-110' : 'text-slate-500 hover:text-slate-300')} />
                <span className={clsx('text-[9px] mt-1 font-semibold tracking-wider transition-colors', isActive ? 'text-indigo-400 font-bold' : 'text-slate-500')}>{item.label}</span>
                {showBadge && (
                  <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                    {deletedEntries.length > 9 ? '9+' : deletedEntries.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </footer>
    </div>
  );
}
