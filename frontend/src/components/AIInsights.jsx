import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAISummary } from '../api/ai';

function AIInsights() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAISummary()
      .then((res) => setData(res))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 rounded-xl p-6">
        <div className="flex items-center gap-2 text-white/70">
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          <span className="text-sm">Analyzing workspace...</span>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const summaryList = data?.summary || [];
  const extractNum = (keyword) => {
    for (const s of summaryList) {
      const m = s.match(new RegExp(`(\\d+)\\s*${keyword}`));
      if (m) return parseInt(m[1], 10);
    }
    return null;
  };
  const pending = extractNum('pending') || 0;
  const highPriority = extractNum('high priority') || 0;
  const delayed = extractNum('overdue') || extractNum('delayed') || 0;
  const warnings = summaryList.filter(s => /overdue|delayed|blocked|critical/i.test(s));
  const positives = summaryList.filter(s => /completed|strong|on track|healthy|available/i.test(s));
  const infos = summaryList.filter(s => !/overdue|delayed|blocked|critical|completed|strong|on track|healthy|available/i.test(s));

  return (
    <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 rounded-xl shadow-lg overflow-hidden">
      <div className="p-5 sm:p-6">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center backdrop-blur-sm">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">AI Insights</h3>
            <p className="text-xs text-indigo-200">Enterprise workspace intelligence</p>
          </div>
          <div className="ml-auto">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold bg-green-400/20 text-green-300 border border-green-400/30">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Live
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <InsightCard
            icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            label="Pending Tasks"
            value={pending}
            bg="bg-amber-400/15"
            textColor="text-amber-300"
          />
          <InsightCard
            icon="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
            label="High Priority"
            value={highPriority}
            bg="bg-rose-400/15"
            textColor="text-rose-300"
          />
          <InsightCard
            icon="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            label="Overdue Tasks"
            value={delayed}
            bg="bg-violet-400/15"
            textColor="text-violet-300"
          />
        </div>

        {summaryList.length > 0 && (
          <div className="bg-white/10 rounded-lg backdrop-blur-sm p-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-4 h-4 text-indigo-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
              </svg>
              <h4 className="text-xs font-semibold text-indigo-200 uppercase tracking-wider">Smart Summary</h4>
            </div>
            <div className="space-y-2">
              {summaryList.slice(0, 6).map((text, i) => {
                const isWarning = /overdue|delayed|blocked|critical/i.test(text);
                const isPositive = /completed|strong|on track|healthy|available/i.test(text);
                return (
                  <div key={i} className="flex items-start gap-2.5">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                      isWarning ? 'bg-rose-400/20 text-rose-300' :
                      isPositive ? 'bg-green-400/20 text-green-300' :
                      'bg-blue-400/20 text-blue-300'
                    }`}>
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        {isWarning
                          ? <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                          : <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                        }
                      </svg>
                    </div>
                    <p className="text-sm text-white/90">{text}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-white/10">
          <Link
            to="/tasks"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-200 hover:text-white transition-colors"
          >
            View all tasks
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}

function InsightCard({ icon, label, value, bg, textColor }) {
  return (
    <div className="bg-white/10 rounded-lg backdrop-blur-sm p-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center`}>
          <svg className={`w-5 h-5 ${textColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
          </svg>
        </div>
        <div>
          <p className="text-2xl font-bold text-white tabular-nums">{value}</p>
          <p className="text-xs text-indigo-200">{label}</p>
        </div>
      </div>
    </div>
  );
}

export default AIInsights;
