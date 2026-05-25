import { useState, useEffect, useRef } from 'react';
import { recommendAssignment } from '../api/ai';
import { getWorkloadAnalysis } from '../api/ai';
import { getUsers } from '../api/tasks';

function WorkloadMeter({ score }) {
  const pct = Math.min(100, (score / 10) * 100);
  const color = pct >= 70 ? '#ef4444' : pct >= 40 ? '#f59e0b' : '#10b981';
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-[10px] font-medium text-gray-400 tabular-nums">{score}</span>
    </div>
  );
}

function ScorePill({ label, value, color }) {
  return (
    <div className="flex items-center gap-1">
      <span className={`text-xs font-bold tabular-nums ${color}`}>{value}</span>
      <span className="text-[9px] text-gray-400">{label}</span>
    </div>
  );
}

function ConfidenceRing({ confidence }) {
  const pct = Math.round(confidence * 100);
  const r = 14;
  const circ = 2 * Math.PI * r;
  return (
    <div className="relative w-10 h-10 shrink-0">
      <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
        <circle cx="18" cy="18" r={r} fill="none" stroke="#f3f4f6" strokeWidth="3" />
        <circle cx="18" cy="18" r={r} fill="none" stroke="#6366f1" strokeWidth="3"
          strokeDasharray={`${(pct / 100) * circ} ${circ}`} strokeLinecap="round" className="transition-all duration-1000" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[9px] font-bold text-indigo-600 tabular-nums">{pct}%</span>
      </div>
    </div>
  );
}

function SmartAssignmentCard({ title, priority, onAssign, selectedUserId, disabled }) {
  const [candidates, setCandidates] = useState([]);
  const [workloadMap, setWorkloadMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [top, setTop] = useState(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    getWorkloadAnalysis().then((d) => {
      const map = {};
      (d?.employees || []).forEach((e) => { map[e.user_id] = e; });
      setWorkloadMap(map);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!title?.trim() && !priority) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setLoading(true);
      recommendAssignment({ title, priority })
        .then((d) => {
          const all = d?.candidates || [];
          setCandidates(all.slice(0, 5));
          setTop(d?.recommended_user || null);
        })
        .catch(() => {
          getUsers().then((data) => {
            const all = Array.isArray(data) ? data : (data?.items || []);
            setCandidates(all.slice(0, 5).map((u) => ({
              user_id: u.id,
              name: u.name || u.email,
              email: u.email,
              role: u.role || '',
              score: null,
              reason: null,
              factors: null,
            })));
            setTop(null);
          }).catch(() => {});
        })
        .finally(() => setLoading(false));
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [title, priority]);

  if (!title?.trim() && !priority) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-violet-400 via-purple-500 to-fuchsia-500" />
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          </div>
          <span className="text-xs font-semibold text-gray-800">AI Smart Assignment</span>
          {loading && (
            <div className="flex items-center gap-1.5 ml-auto">
              <div className="w-3 h-3 border-2 border-gray-200 border-t-indigo-500 rounded-full animate-spin" />
              <span className="text-[10px] text-gray-400">Analyzing...</span>
            </div>
          )}
          {!loading && top && (
            <span className="ml-auto px-1.5 py-0.5 rounded text-[9px] font-semibold bg-violet-100 text-violet-700 border border-violet-200">
              AI RECOMMENDED
            </span>
          )}
        </div>

        {!loading && candidates.length === 0 && title?.trim() && (
          <div className="py-4 text-center text-xs text-gray-400">
            Enter task details to get AI recommendations
          </div>
        )}

        {loading && candidates.length === 0 && (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 animate-pulse">
                <div className="w-8 h-8 rounded-full bg-gray-200" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-24 bg-gray-200 rounded" />
                  <div className="h-2 w-32 bg-gray-100 rounded" />
                </div>
                <div className="w-10 h-10 bg-gray-200 rounded-full" />
              </div>
            ))}
          </div>
        )}

        {!loading && candidates.length > 0 && (
          <div className="space-y-2">
            {candidates.slice(0, 3).map((c, i) => {
              const wl = workloadMap[c.user_id];
              const isSelected = selectedUserId === c.user_id;
              const isTop = i === 0;
              return (
                <div
                  key={c.user_id}
                  className={`relative flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 ${
                    isSelected
                      ? 'border-indigo-300 bg-indigo-50/80 ring-1 ring-indigo-200'
                      : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50/50'
                  } ${disabled ? 'opacity-60 pointer-events-none' : 'cursor-pointer'}`}
                  onClick={() => !disabled && onAssign?.(c.user_id, c.name, c.email)}
                >
                  {isTop && (
                    <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded text-[8px] font-bold bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-sm">
                      BEST
                    </span>
                  )}

                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${
                    isSelected ? 'bg-indigo-600' : isTop ? 'bg-gradient-to-br from-violet-500 to-indigo-600' : 'bg-gray-400'
                  }`}>
                    {c.name?.charAt(0)?.toUpperCase() || c.email?.charAt(0)?.toUpperCase() || '?'}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 truncate">{c.name}</span>
                      <span className="text-[9px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{c.role}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <ScorePill label="Score" value={c.score} color="text-indigo-600" />
                      {wl && (
                        <>
                          <ScorePill label="Active" value={wl.active_tasks} color="text-amber-600" />
                          <WorkloadMeter score={wl.workload_score} />
                        </>
                      )}
                      {!wl && c.factors?.workload && (
                        <ScorePill label="Capacity" value={`${Math.round(c.factors.workload.score)}%`} color="text-green-600" />
                      )}
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1 leading-tight">{c.reason}</p>
                  </div>

                  <div className="flex flex-col items-center gap-1">
                    <ConfidenceRing confidence={(c.score || 0) / 100} />
                    {isSelected && (
                      <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default SmartAssignmentCard;
