import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getHighPriorityTasks } from '../api/ai';

const urgencyColors = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-amber-400',
  low: 'bg-slate-400',
};

const urgencyBg = {
  critical: 'bg-red-50 border-red-200',
  high: 'bg-orange-50 border-orange-200',
  medium: 'bg-amber-50 border-amber-200',
  low: 'bg-slate-50 border-slate-200',
};

const urgencyText = {
  critical: 'text-red-700',
  high: 'text-orange-700',
  medium: 'text-amber-700',
  low: 'text-slate-600',
};

function UrgencyBadge({ level }) {
  const color = urgencyColors[level] || urgencyColors.low;
  const bg = urgencyBg[level] || urgencyBg.low;
  const text = urgencyText[level] || urgencyText.low;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${bg} ${text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${color}`} />
      {level}
    </span>
  );
}

function HighPriorityTasksCard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getHighPriorityTasks()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-5">
        <div className="flex items-center gap-2 text-gray-400">
          <div className="w-5 h-5 border-2 border-gray-200 border-t-indigo-500 rounded-full animate-spin" />
          <span className="text-sm">Analyzing tasks...</span>
        </div>
      </div>
    );
  }

  if (!data || data.total === 0) return null;

  const levelOrder = ['critical', 'high', 'medium', 'low'];

  return (
    <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-red-500 via-orange-400 to-amber-300" />
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">High Priority Tasks</h3>
            <p className="text-xs text-gray-400 mt-0.5">Tasks needing immediate attention</p>
          </div>
          <div className="flex items-center gap-2">
            {levelOrder.map((level) => {
              const count = data[level] || 0;
              if (count === 0) return null;
              return (
                <div key={level} className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 rounded-lg">
                  <span className={`w-2 h-2 rounded-full ${urgencyColors[level]}`} />
                  <span className="text-xs font-semibold text-gray-700">{count}</span>
                  <span className="text-[10px] text-gray-400 capitalize">{level}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          {data.tasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <UrgencyBadge level={task.urgency_level} />
                  <span className="text-sm font-medium text-gray-900 truncate">{task.title}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                  {task.assignee_name && (
                    <span className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                      </svg>
                      {task.assignee_name}
                    </span>
                  )}
                  {task.days_remaining !== null && task.days_remaining !== undefined && (
                    <span className={`flex items-center gap-1 ${
                      task.days_remaining < 0 ? 'text-red-500 font-medium' :
                      task.days_remaining <= 1 ? 'text-orange-500 font-medium' :
                      'text-gray-400'
                    }`}>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {task.days_remaining < 0
                        ? `${Math.abs(task.days_remaining)}d overdue`
                        : `${task.days_remaining}d remaining`
                      }
                    </span>
                  )}
                </div>
              </div>
              <Link
                to={`/tasks/${task.id}`}
                className="ml-3 p-1.5 rounded-lg text-gray-300 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default HighPriorityTasksCard;
