import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getExecutions, advanceWorkflow } from '../../api/workflows';
import { FiArrowLeft, FiPlay, FiCheckCircle, FiXCircle, FiClock } from 'react-icons/fi';

const statusColors = { running: 'bg-blue-100 text-blue-800', completed: 'bg-green-100 text-green-800', failed: 'bg-red-100 text-red-800', paused: 'bg-yellow-100 text-yellow-800' };

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function WorkflowExecutions() {
  const { id } = useParams();
  const [executions, setExecutions] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const params = { page: 1, size: 50 };
      if (id) params.workflow_id = id;
      const data = await getExecutions(params);
      setExecutions(data.items || []);
    } catch { setExecutions([]); }
    setLoading(false);
  };
  useEffect(() => { load(); }, [id]);

  if (loading) return <div className="max-w-7xl mx-auto px-4 py-8"><div className="animate-pulse bg-gray-200 rounded-2xl h-96" /></div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to="/workflows" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-indigo-600 mb-6 transition-colors"><FiArrowLeft className="w-4 h-4" />Back to Workflows</Link>
      <h1 className="text-xl font-bold text-gray-900 mb-6">Workflow Executions</h1>

      {executions.length === 0 ? (
        <div className="text-center py-16 bg-white/50 rounded-2xl border border-gray-200/50">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 flex items-center justify-center"><FiPlay className="w-8 h-8 text-gray-400" /></div>
          <p className="text-gray-500 font-semibold">No executions yet</p>
          <p className="text-sm text-gray-400 mt-1">Execute a workflow to see results here</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200/60">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Entity</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Started</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Completed</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {executions.map(ex => (
                  <tr key={ex.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="px-4 py-3 text-sm font-mono text-gray-700">#{ex.id}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{ex.entity_type} #{ex.entity_id}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[ex.status] || 'bg-gray-100 text-gray-800'}`}>{ex.status}</span></td>
                    <td className="px-4 py-3 text-sm text-gray-500">{formatDate(ex.started_at)}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{formatDate(ex.completed_at)}</td>
                    <td className="px-4 py-3 text-right">
                      {ex.status === 'running' && (
                        <Link to={`/workflows`} className="text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors">Manage</Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
