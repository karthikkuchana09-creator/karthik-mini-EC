import { useState, useEffect } from 'react';
import { FiClock, FiX, FiChevronRight, FiCheckCircle, FiAlertCircle, FiPlay, FiRefreshCw } from 'react-icons/fi';
import platformApi from '../../../services/platform/platformService';

const STATUS_CONFIG = {
  pending: { icon: FiClock, color: 'text-amber-500', bg: 'bg-amber-50 border-amber-200', label: 'Pending' },
  running: { icon: FiPlay, color: 'text-blue-500', bg: 'bg-blue-50 border-blue-200', label: 'Running' },
  completed: { icon: FiCheckCircle, color: 'text-green-500', bg: 'bg-green-50 border-green-200', label: 'Completed' },
  completed_with_warnings: { icon: FiAlertCircle, color: 'text-orange-500', bg: 'bg-orange-50 border-orange-200', label: 'Completed with Warnings' },
  failed: { icon: FiAlertCircle, color: 'text-red-500', bg: 'bg-red-50 border-red-200', label: 'Failed' },
};

export default function ExecutionHistoryDrawer({ isOpen, onClose, workflow }) {
  const [executions, setExecutions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedExecution, setSelectedExecution] = useState(null);

  const loadExecutions = async () => {
    if (!workflow) return;
    setLoading(true);
    setError(null);
    try {
      const res = await platformApi.workflows.executions(workflow.id, { page, size: 10 });
      const data = res.data;
      setExecutions(data.items || data.data || []);
      setTotalPages(data.total_pages || data.pages || 1);
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || 'Failed to load executions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (isOpen && workflow) { setPage(1); loadExecutions(); } }, [isOpen, workflow?.id]);
  useEffect(() => { if (isOpen && workflow) loadExecutions(); }, [page]);

  const handleClose = () => { setSelectedExecution(null); onClose(); };

  return (
    <>
      <div className={`fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-white shadow-2xl border-l border-gray-200 transform transition-all duration-300 ease-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-sm">
              <FiClock className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Execution History</h3>
              <p className="text-xs text-gray-500">{workflow?.name || ''}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadExecutions} className="btn-icon" title="Refresh">
              <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={handleClose} className="btn-icon" title="Close">
              <FiX className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto h-[calc(100vh-65px)]">
          {loading && executions.length === 0 && (
            <div className="p-8 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-gray-50 rounded-xl p-4 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
                  <div className="h-3 bg-gray-100 rounded w-2/3" />
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="m-6 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
          )}

          {!loading && !error && executions.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 px-6">
              <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mb-3">
                <FiClock className="w-7 h-7 text-gray-300" />
              </div>
              <p className="text-sm font-semibold text-gray-700 mb-1">No executions yet</p>
              <p className="text-xs text-gray-400 text-center">Execute this workflow to see history here.</p>
            </div>
          )}

          {!loading && executions.length > 0 && (
            <div className="p-4 space-y-2">
              {executions.map((exec) => {
                const cfg = STATUS_CONFIG[exec.status] || STATUS_CONFIG.pending;
                const Icon = cfg.icon;
                const isSelected = selectedExecution?.id === exec.id;

                return (
                  <div key={exec.id}>
                    <button
                      onClick={() => setSelectedExecution(isSelected ? null : exec)}
                      className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${
                        isSelected
                          ? 'bg-indigo-50 border-indigo-200 shadow-sm'
                          : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg ${cfg.bg.split(' ')[0]} flex items-center justify-center`}>
                            <Icon className={`w-4 h-4 ${cfg.color}`} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                                {cfg.label}
                              </span>
                              <span className="text-xs text-gray-400">{exec.entity_type}</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(exec.started_at).toLocaleString('en-US', {
                                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>
                        <FiChevronRight className={`w-4 h-4 text-gray-300 transition-transform duration-200 ${isSelected ? 'rotate-90' : ''}`} />
                      </div>
                    </button>

                    {isSelected && (
                      <div className="mx-4 mb-2 p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Entity ID</p>
                            <p className="text-sm font-medium text-gray-900">#{exec.entity_id}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Trigger</p>
                            <p className="text-sm font-medium text-gray-900">{exec.trigger_event || 'Manual'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Started</p>
                            <p className="text-sm text-gray-700">{new Date(exec.started_at).toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Completed</p>
                            <p className="text-sm text-gray-700">{exec.completed_at ? new Date(exec.completed_at).toLocaleString() : '—'}</p>
                          </div>
                        </div>

                        {exec.result_log && exec.result_log.length > 0 && (
                          <div>
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Result Log</p>
                            <div className="space-y-1.5">
                              {exec.result_log.map((log, idx) => (
                                <div key={idx} className="flex items-center gap-2 text-xs">
                                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${log.condition_passed ? 'bg-green-500' : 'bg-red-500'}`} />
                                  <span className="text-gray-700 font-medium">{log.rule_name}</span>
                                  <span className="text-gray-400">— {log.action}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {exec.error_message && (
                          <div className="p-2.5 rounded-lg bg-red-50 border border-red-200">
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Error</p>
                            <p className="text-xs text-red-700">{exec.error_message}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {totalPages > 1 && (
                <div className="flex items-center justify-between px-2 py-3">
                  <span className="text-xs text-gray-400">Page {page} of {totalPages}</span>
                  <div className="flex gap-2">
                    <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="btn-sm btn-secondary">Previous</button>
                    <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="btn-sm btn-secondary">Next</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={handleClose} />
      )}
    </>
  );
}
