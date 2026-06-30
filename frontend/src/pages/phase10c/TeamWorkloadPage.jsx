import { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FiArrowLeft,   FiActivity, FiCheckCircle, FiClock,
  FiAlertTriangle, FiUsers, FiBarChart2,
  FiPieChart, FiLayers,
} from 'react-icons/fi';
import { workloadService } from '../../services/workloadService';
import { getErrorMessage } from '../../utils/errorHandler';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const STATUS_STYLES = {
  todo: { bg: 'bg-slate-100', text: 'text-slate-600', bar: 'bg-slate-400', label: 'To Do' },
  in_progress: { bg: 'bg-blue-50', text: 'text-blue-700', bar: 'bg-blue-500', label: 'In Progress' },
  in_review: { bg: 'bg-amber-50', text: 'text-amber-700', bar: 'bg-amber-500', label: 'In Review' },
  done: { bg: 'bg-emerald-50', text: 'text-emerald-700', bar: 'bg-emerald-500', label: 'Done' },
  completed: { bg: 'bg-emerald-50', text: 'text-emerald-700', bar: 'bg-emerald-500', label: 'Completed' },
  cancelled: { bg: 'bg-red-50', text: 'text-red-700', bar: 'bg-red-400', label: 'Cancelled' },
};

const PRIORITY_STYLES = {
  low: { bar: 'bg-slate-400', label: 'Low' },
  medium: { bar: 'bg-blue-500', label: 'Medium' },
  high: { bar: 'bg-orange-500', label: 'High' },
  critical: { bar: 'bg-red-500', label: 'Critical' },
};

function ProgressBar({ value, max, color = 'bg-indigo-500', size = 'h-2', showLabel }) {
  const pct = max > 0 ? Math.min(Math.round((value / max) * 100), 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className={`flex-1 bg-gray-100 rounded-full ${size}`}>
        <div className={`${color} ${size} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      {showLabel && <span className="text-xs text-gray-500 w-8 text-right">{pct}%</span>}
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg ${color?.bg || 'bg-gray-50'} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${color?.icon || 'text-gray-500'}`} />
        </div>
        <div>
          <p className="text-[11px] text-gray-500 font-medium">{label}</p>
          <p className={`text-xl font-bold ${color?.text || 'text-gray-900'}`}>{value ?? '-'}</p>
          {sub && <p className="text-[10px] text-gray-400">{sub}</p>}
        </div>
      </div>
    </div>
  );
}

export default function TeamWorkloadPage() {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const tid = Number(teamId);

  const [workload, setWorkload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchWorkload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await workloadService.getTeamWorkload(tid);
      setWorkload(data);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load workload'));
    } finally {
      setLoading(false);
    }
  }, [tid]);

  useEffect(() => { fetchWorkload(); }, [fetchWorkload]); // eslint-disable-line react-hooks/set-state-in-effect

  const total = workload?.total_tasks ?? workload?.totalTasks ?? 0;
  const completed = workload?.completed_tasks ?? workload?.completedTasks ?? 0;
  const pending = workload?.pending_tasks ?? workload?.pendingTasks ?? 0;
  const overdue = workload?.overdue_tasks ?? workload?.overdueTasks ?? 0;
  const members = workload?.members ?? workload?.team_members ?? [];
  const byStatus = workload?.by_status ?? workload?.statusDistribution ?? [];
  const byPriority = workload?.by_priority ?? workload?.priorityDistribution ?? [];
  const teamName = workload?.team_name ?? workload?.name ?? '';

  if (loading) {
    return (
      <div className="page-container max-w-6xl">
        <LoadingSpinner fullPage text="Loading workload dashboard..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container max-w-6xl">
        <div className="bg-white rounded-xl border border-gray-200 shadow-card p-12 text-center">
          <FiAlertTriangle className="w-10 h-10 text-red-300 mx-auto mb-3" />
          <h2 className="text-base font-semibold text-gray-900 mb-2">Error Loading Workload</h2>
          <p className="text-sm text-gray-500 mb-4">{error}</p>
          <button onClick={fetchWorkload} className="btn-secondary btn-sm">Try Again</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container max-w-6xl">
      <div className="mb-6">
        <button onClick={() => navigate(`/teams/${tid}`)}
          className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 mb-3 transition-colors">
          <FiArrowLeft className="w-3.5 h-3.5" /> Back to Team
        </button>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <FiBarChart2 className="w-5 h-5 text-gray-400" />
          {teamName || `Team #${tid}`} Workload Dashboard
        </h1>
      </div>

      {!workload ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <FiActivity className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-700">No workload data</p>
          <p className="text-xs text-gray-400 mt-1">Workload analytics will appear once tasks are assigned.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KpiCard icon={FiLayers} label="Total Tasks" value={total}
              color={{ bg: 'bg-indigo-50', icon: 'text-indigo-600', text: 'text-indigo-700' }} />
            <KpiCard icon={FiCheckCircle} label="Completed" value={completed}
              color={{ bg: 'bg-emerald-50', icon: 'text-emerald-600', text: 'text-emerald-700' }}
              sub={total > 0 ? `${Math.round((completed / total) * 100)}% completion` : undefined} />
            <KpiCard icon={FiClock} label="Pending" value={pending}
              color={{ bg: 'bg-amber-50', icon: 'text-amber-600', text: 'text-amber-700' }} />
            <KpiCard icon={FiAlertTriangle} label="Overdue" value={overdue}
              color={{ bg: 'bg-red-50', icon: 'text-red-600', text: overdue > 0 ? 'text-red-600' : 'text-gray-900' }} />
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <FiBarChart2 className="w-4 h-4 text-gray-400" />
              <h3 className="text-sm font-semibold text-gray-900">Overall Progress</h3>
            </div>
            <div className="space-y-2">
              <ProgressBar value={completed} max={total} color="bg-emerald-500" size="h-3" showLabel />
              <div className="flex items-center justify-between text-[10px] text-gray-400">
                <span>{completed} of {total} tasks completed</span>
                <span>{total - completed} remaining</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {byStatus.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-4">
                  <FiPieChart className="w-4 h-4 text-gray-400" />
                  <h3 className="text-sm font-semibold text-gray-900">Tasks by Status</h3>
                </div>
                {(() => {
                  const maxVal = Math.max(...byStatus.map((s) => s.count || s.value || 0), 1);
                  return (
                    <div className="space-y-3">
                      {byStatus.map((s, i) => {
                        const val = s.count || s.value || 0;
                        const key = s.status || s.key || s.label || '';
                        const style = STATUS_STYLES[key.toLowerCase()] || { bar: 'bg-gray-400', label: key };
                        return (
                          <div key={i}>
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-gray-600">{style.label}</span>
                              <span className="text-gray-400 font-medium">{val}</span>
                            </div>
                            <ProgressBar value={val} max={maxVal} color={style.bar} />
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}

            {byPriority.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-4">
                  <FiLayers className="w-4 h-4 text-gray-400" />
                  <h3 className="text-sm font-semibold text-gray-900">Tasks by Priority</h3>
                </div>
                {(() => {
                  const maxVal = Math.max(...byPriority.map((p) => p.count || p.value || 0), 1);
                  return (
                    <div className="space-y-3">
                      {byPriority.map((p, i) => {
                        const val = p.count || p.value || 0;
                        const key = p.priority || p.key || p.label || '';
                        const style = PRIORITY_STYLES[key.toLowerCase()] || { bar: 'bg-gray-400', label: key };
                        return (
                          <div key={i}>
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-gray-600 capitalize">{style.label}</span>
                              <span className="text-gray-400 font-medium">{val}</span>
                            </div>
                            <ProgressBar value={val} max={maxVal} color={style.bar} />
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          {members.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                <FiUsers className="w-4 h-4 text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-900">Tasks by Member</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-500 uppercase">Member</th>
                      <th className="text-center px-3 py-2.5 text-[10px] font-semibold text-gray-500 uppercase">Total</th>
                      <th className="text-center px-3 py-2.5 text-[10px] font-semibold text-gray-500 uppercase">Completed</th>
                      <th className="text-center px-3 py-2.5 text-[10px] font-semibold text-gray-500 uppercase">Pending</th>
                      <th className="text-center px-3 py-2.5 text-[10px] font-semibold text-gray-500 uppercase">Overdue</th>
                      <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-500 uppercase">Progress</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {members.map((m, i) => {
                      const mTotal = m.task_count ?? m.tasks ?? m.total ?? 0;
                      const mCompleted = m.completed ?? m.completed_tasks ?? 0;
                      const mPending = m.pending ?? m.pending_tasks ?? 0;
                      const mOverdue = m.overdue ?? m.overdue_tasks ?? 0;
                      return (
                        <tr key={m.user_id || m.id || i} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                                {(m.name || m.email || '?').charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-medium text-gray-700 truncate">{m.name || 'Unknown'}</p>
                                {m.email && <p className="text-[10px] text-gray-400 truncate">{m.email}</p>}
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-center text-xs font-semibold text-gray-900">{mTotal}</td>
                          <td className="px-3 py-3 text-center text-xs font-semibold text-emerald-600">{mCompleted}</td>
                          <td className={`px-3 py-3 text-center text-xs font-semibold ${mPending > 0 ? 'text-amber-600' : 'text-gray-400'}`}>{mPending}</td>
                          <td className={`px-3 py-3 text-center text-xs font-semibold ${mOverdue > 0 ? 'text-red-600' : 'text-gray-400'}`}>{mOverdue}</td>
                          <td className="px-4 py-3">
                            <ProgressBar value={mCompleted} max={mTotal} color="bg-emerald-500" />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {workload.recommendations?.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h4 className="text-xs font-semibold text-amber-800 flex items-center gap-1.5 mb-2">
                <FiAlertTriangle className="w-3.5 h-3.5" />
                Recommendations
              </h4>
              <ul className="space-y-1">
                {workload.recommendations.map((rec, i) => (
                  <li key={i} className="text-xs text-amber-700 flex items-start gap-1.5">
                    <span className="text-amber-500 mt-0.5">&bull;</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
