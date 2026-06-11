'use client';

import { useState, useEffect } from 'react';
import { Activity, Database, AlertCircle, CheckCircle, XCircle, Play, ChevronRight, LayoutDashboard, Copy, Check, X } from 'lucide-react';
import clsx from 'clsx';

type TabType = 'overview' | 'stage1' | 'errors' | 'w2Errors' | 'approvedBriefs' | 'stage3' | 'rejected';

// ── TEXT DRAWER (Popup Sidebar) ──────────────────────────────
const TextDrawer = ({ text, onClose }: { text: string; onClose: () => void }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Close on Escape key & Lock background scroll
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    
    // Save original body overflow and set to hidden
    const originalOverflow = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';
    
    return () => {
      window.removeEventListener('keydown', handler);
      document.body.style.overflow = originalOverflow;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm transition-all duration-300"
      onClick={onClose}
    >
      <div
        className="bg-[#0b0c16] border-l border-cyan-500/20 w-full max-w-md h-[100dvh] flex flex-col shadow-2xl overflow-hidden animate-drawer-slide-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02] flex-shrink-0">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Cell Details</span>
          <div className="flex items-center gap-3">
            {/* Copy Button */}
            <button
              onClick={handleCopy}
              className={clsx(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all text-xs font-semibold cursor-pointer",
                copied 
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400" 
                  : "border-cyan-500/30 bg-cyan-500/5 text-cyan-400 hover:bg-cyan-500/15 hover:shadow-lg hover:shadow-cyan-500/10"
              )}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied!' : 'Copy Text'}
            </button>
            {/* Close Button */}
            <button 
              onClick={onClose} 
              className="flex items-center justify-center w-8 h-8 rounded-lg border border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200 transition-all cursor-pointer"
              aria-label="Close drawer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="p-6 overflow-y-auto text-sm leading-relaxed text-slate-300 whitespace-pre-wrap break-words select-text flex-1 drawer-scrollbar">
          {text}
        </div>
      </div>
    </div>
  );
};

// ── EXPANDABLE TEXT (now opens drawer) ────────────────────────
const ExpandableText = ({ text, maxLength = 80 }: { text: string, maxLength?: number }) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  if (!text || typeof text !== 'string' || text.length <= maxLength) {
    return <div className="max-w-md">{text}</div>;
  }
  return (
    <>
      <div className="max-w-md whitespace-normal leading-relaxed">
        {`${text.slice(0, maxLength)}...`}
        <button
          onClick={() => setDrawerOpen(true)}
          className="ml-2 text-c-cyan text-xs font-semibold hover:underline"
        >
          Read more
        </button>
      </div>
      {drawerOpen && <TextDrawer text={text} onClose={() => setDrawerOpen(false)} />}
    </>
  );
};

export default function Dashboard({ initialData }: { initialData: any }) {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [runningStage, setRunningStage] = useState<number | null>(null);

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
    } catch (err) {
      alert(`Error triggering stage ${stage}`);
    } finally {
      setRunningStage(null);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Command Center', icon: LayoutDashboard },
    { id: 'stage1', label: 'Stage 1 Output', icon: Database },
    { id: 'errors', label: 'W1 Errors', icon: AlertCircle },
    { id: 'w2Errors', label: 'W2 Errors', icon: AlertCircle },
    { id: 'approvedBriefs', label: 'Approved Briefs', icon: CheckCircle },
    { id: 'stage3', label: 'Stage 3 Queue', icon: Database },
    { id: 'rejected', label: 'Rejected Signals', icon: XCircle },
  ];

  const renderTable = (data: any[]) => {
    if (!data || data.length === 0) return <div className="text-c-muted p-4">No data available.</div>;
    
    // Sort data descending by relevance_score, and then by urgency (High > Medium > Low)
    const sortedData = [...data].sort((a, b) => {
      const scoreA = a.relevance_score ? Number(a.relevance_score) : 0;
      const scoreB = b.relevance_score ? Number(b.relevance_score) : 0;
      
      if (scoreA !== scoreB) {
        return scoreB - scoreA;
      }
      
      const getUrgencyWeight = (urgency: string) => {
        if (!urgency) return 0;
        const u = String(urgency).toLowerCase();
        if (u === 'high') return 3;
        if (u === 'medium' || u === 'med') return 2;
        if (u === 'low') return 1;
        return 0;
      };
      
      const urgencyA = getUrgencyWeight(a.urgency);
      const urgencyB = getUrgencyWeight(b.urgency);
      
      return urgencyB - urgencyA;
    });

    const headers = Object.keys(sortedData[0] || {});
    
    return (
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '2.5rem', minWidth: '2.5rem', textAlign: 'center' }}>#</th>
              {headers.map(h => <th key={h}>{h.replace(/_/g, ' ')}</th>)}
            </tr>
          </thead>
          <tbody>
            {sortedData.map((row, i) => (
              <tr key={i}>
                <td style={{ textAlign: 'center', fontVariantNumeric: 'tabular-nums', color: 'var(--c-muted)', fontWeight: 600, fontSize: '0.75rem' }}>{i + 1}</td>
                {headers.map(h => (
                  <td key={h}>
                    {h === 'url' ? (
                      <a href={row[h]} target="_blank" rel="noreferrer" className="text-c-cyan hover:underline">Link</a>
                    ) : h === 'urgency' ? (
                      <span className={clsx('badge', `badge-${row[h].toLowerCase()}`)}>{row[h]}</span>
                    ) : (
                      <ExpandableText text={row[h]} />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-c-bg text-c-text flex flex-col md:flex-row">
      {/* Sidebar (Desktop) / Top bar (Mobile) */}
      <aside className="glass m-2 md:m-4 md:mr-0 md:w-64 p-4 flex flex-col shrink-0 z-10">
        <div className="flex items-center gap-3 mb-8 px-2">
          <img src="/logo.png" alt="Contrails AI" className="w-8 h-8 rounded-lg object-contain shadow-cyan" />
          <h1 className="font-bold text-lg tracking-tight">Contrails <span className="text-c-cyan">AI</span></h1>
        </div>

        <nav className="flex flex-row md:flex-col gap-1 overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={clsx(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all whitespace-nowrap text-sm font-medium",
                  isActive ? "bg-c-cyan-dim text-c-cyan" : "text-c-muted hover:text-white hover:bg-white/5"
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-2 md:p-4 overflow-hidden flex flex-col h-[100dvh]">
        <div className="glass flex-1 overflow-y-auto p-4 md:p-6 relative">
          
          {/* Header */}
          <header className="flex justify-between items-center mb-8 border-b border-c-border pb-4">
            <div>
              <h2 className="text-2xl font-bold">{tabs.find(t => t.id === activeTab)?.label}</h2>
              <p className="text-c-muted text-sm mt-1">Live from Google Sheets & n8n</p>
            </div>
            {activeTab === 'overview' && (
              <div className="flex gap-2">
                <span className="flex items-center gap-2 text-xs text-c-green bg-c-green-dim px-3 py-1 rounded-full border border-c-green/30">
                  <span className="pulse-dot"></span> Pipeline Active
                </span>
              </div>
            )}
          </header>

          {/* Content Area */}
          {activeTab === 'overview' ? (
            <div className="space-y-8 animate-fade-in">
              {/* Stats Row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Total Signals', value: initialData.stage1?.length || 0, color: 'cyan' },
                  { label: 'Approved Briefs', value: initialData.approvedBriefs?.length || 0, color: 'purple' },
                  { label: 'Queue', value: initialData.stage3Queue?.length || 0, color: 'amber' },
                  { label: 'Errors', value: (initialData.errors?.length || 0) + (initialData.w2Errors?.length || 0), color: 'red' },
                ].map((s, i) => (
                  <div key={i} className="glass-sm p-4 stat-card flex flex-col justify-between">
                    <span className="text-c-muted text-xs font-semibold uppercase tracking-wider">{s.label}</span>
                    <span className={`text-2xl font-bold mt-2 text-c-${s.color}`}>{s.value}</span>
                  </div>
                ))}
              </div>

              {/* Workflow Triggers */}
              <div className="glass-sm p-6">
                <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                  <Play className="w-5 h-5 text-c-cyan" /> Trigger Workflows
                </h3>
                
                <div className="flex flex-col md:flex-row items-center gap-4 justify-between relative">
                  {/* Connectors (Desktop only) */}
                  <div className="hidden md:block absolute top-1/2 left-[15%] right-[15%] h-[2px] bg-c-border -z-10"></div>

                  {[1, 2, 3].map((stage) => (
                    <div key={stage} className="flex flex-col items-center glass p-6 rounded-xl w-full md:w-1/3 bg-c-surface relative z-0">
                      <div className="w-12 h-12 rounded-full bg-c-cyan-dim border border-c-cyan/30 flex items-center justify-center mb-4 text-c-cyan font-bold text-lg">
                        {stage}
                      </div>
                      <h4 className="font-semibold mb-1">Stage {stage}</h4>
                      <p className="text-xs text-c-muted text-center mb-6 h-8">
                        {stage === 1 ? 'Scrape signals & papers' : stage === 2 ? 'Generate briefs & score' : 'Create narratives & posts'}
                      </p>
                      <button 
                        onClick={() => triggerWorkflow(stage)}
                        disabled={runningStage !== null}
                        className={clsx(
                          "w-full py-2 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2",
                          runningStage === stage ? "bg-c-cyan/20 text-c-cyan" : "bg-c-cyan text-black hover:shadow-cyan"
                        )}
                      >
                        {runningStage === stage ? (
                          <span className="flex items-center gap-2"><span className="animate-spin">⍥</span> Running...</span>
                        ) : (
                          <>Run Workflow <ChevronRight className="w-4 h-4" /></>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
             <div className="animate-fade-in glass-sm p-1 rounded-xl overflow-hidden">
               {renderTable(
                 activeTab === 'stage1' ? initialData.stage1 :
                 activeTab === 'errors' ? initialData.errors :
                 activeTab === 'w2Errors' ? initialData.w2Errors :
                 activeTab === 'approvedBriefs' ? initialData.approvedBriefs :
                 activeTab === 'stage3' ? initialData.stage3Queue :
                 activeTab === 'rejected' ? initialData.rejectedSignals :
                 []
               )}
             </div>
          )}
        </div>
      </main>
    </div>
  );
}
