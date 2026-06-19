import { useState, useEffect, useRef } from 'react';
import { formatTimestamp } from '../../../utils/format';

const STAT_ACCENTS = [
  { bar: 'bg-indigo-500', icon: 'from-indigo-500 to-indigo-600', text: 'text-indigo-600', bg: 'bg-indigo-50' },
  { bar: 'bg-emerald-500', icon: 'from-emerald-500 to-teal-600', text: 'text-emerald-600', bg: 'bg-emerald-50' },
  { bar: 'bg-blue-500', icon: 'from-blue-500 to-cyan-600', text: 'text-blue-600', bg: 'bg-blue-50' },
];

function AnimatedNumber({ value }) {
  const [display, setDisplay] = useState(0);
  const prevRef = useRef(0);
  const rafRef = useRef(null);

  useEffect(() => {
    const start = prevRef.current;
    const diff = value - start;
    if (diff === 0) { setDisplay(value); return; }
    const duration = 600;
    const startTime = performance.now();

    function tick(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + diff * eased));
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    }

    prevRef.current = value;
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value]);

  return <>{display}</>;
}

export default function OverviewTab({ workspace }) {
  const stats = [
    { label: 'Members', value: workspace.member_count ?? 0, icon: 'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z' },
    { label: 'Channels', value: workspace.channel_count ?? 0, icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
    { label: 'Tasks', value: workspace.task_count ?? 0, icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {stats.map((stat, idx) => {
          const accent = STAT_ACCENTS[idx];
          return (
            <div
              key={stat.label}
              className="relative bg-white rounded-xl border border-gray-200/70 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
            >
              <div className={`h-1 w-full ${accent.bar}`} />
              <div className="p-5 flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${accent.icon} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d={stat.icon} />
                  </svg>
                </div>
                <div>
                  <p className="text-3xl font-bold text-gray-900 tabular-nums">
                    <AnimatedNumber value={stat.value} />
                  </p>
                  <p className="text-xs text-gray-500 font-medium">{stat.label}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {workspace.description && (
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="w-1 h-4 bg-indigo-500 rounded-full" />
            About
          </h3>
          <div className="bg-white rounded-xl border border-gray-200/70 p-5 border-l-4 border-l-indigo-500 shadow-sm">
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{workspace.description}</p>
          </div>
        </div>
      )}

      <div>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <span className="w-1 h-4 bg-gray-300 rounded-full" />
          Details
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-center gap-3 bg-white rounded-xl border border-gray-200/70 p-4">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Created</p>
              <p className="text-sm text-gray-900 tabular-nums truncate">{formatTimestamp(workspace.created_at)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-white rounded-xl border border-gray-200/70 p-4">
            <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Updated</p>
              <p className="text-sm text-gray-900 tabular-nums truncate">{formatTimestamp(workspace.updated_at)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-white rounded-xl border border-gray-200/70 p-4">
            <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Workspace ID</p>
              <p className="text-sm text-gray-900 tabular-nums font-mono truncate">#{workspace.id}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
