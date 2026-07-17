import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getWorkflows, deleteWorkflow } from '../../api/workflows';
import { FiGitBranch, FiPlus, FiEdit2, FiTrash2, FiActivity, FiPlay } from 'react-icons/fi';

const statusColors = { active: 'bg-green-100 text-green-800', inactive: 'bg-gray-100 text-gray-800' };

export default function WorkflowList() {
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try { const data = await getWorkflows({ page: 1, size: 50 }); setWorkflows(data.items || []); }
    catch { setWorkflows([]); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this workflow?')) return;
    await deleteWorkflow(id);
    load();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Workflow Automation</h1>
          <p className="text-sm text-gray-500 mt-1">Define and manage automated workflows</p>
        </div>
        <Link to="/workflows/new" className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 text-white hover:from-indigo-700 hover:to-indigo-800 transition-all shadow-md">
          <FiPlus className="w-4 h-4" /> New Workflow
        </Link>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => <div key={i} className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-5 animate-pulse"><div className="h-4 bg-gray-200 rounded w-3/4 mb-3" /><div className="h-3 bg-gray-200 rounded w-1/2" /></div>)}
        </div>
      ) : workflows.length === 0 ? (
        <div className="text-center py-16 bg-white/50 rounded-2xl border border-gray-200/50">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 flex items-center justify-center"><FiGitBranch className="w-8 h-8 text-gray-400" /></div>
          <p className="text-gray-500 font-semibold">No workflows yet</p>
          <p className="text-sm text-gray-400 mt-1">Create your first automated workflow</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {workflows.map(wf => (
            <div key={wf.id} className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-50 to-indigo-100 flex items-center justify-center text-indigo-600"><FiGitBranch className="w-5 h-5" /></div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">{wf.name}</h3>
                    <p className="text-xs text-gray-400">{wf.entity_type}</p>
                  </div>
                </div>
                <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[wf.status] || statusColors.inactive}`}>{wf.status}</span>
              </div>
              {wf.description && <p className="text-xs text-gray-500 line-clamp-2 mb-3">{wf.description}</p>}
              <div className="flex items-center justify-between text-xs text-gray-400 mb-3">
                <span>{wf.stages?.length || 0} stages</span>
                <span>{wf.transitions?.length || 0} transitions</span>
              </div>
              <div className="flex items-center gap-1 pt-3 border-t border-gray-100">
                <Link to={`/workflows/${wf.id}`} className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all" title="View"><FiActivity className="w-4 h-4" /></Link>
                <Link to={`/workflows/${wf.id}/edit`} className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all" title="Edit"><FiEdit2 className="w-4 h-4" /></Link>
                <Link to={`/workflows/${wf.id}/executions`} className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all" title="Executions"><FiPlay className="w-4 h-4" /></Link>
                <button onClick={() => handleDelete(wf.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all" title="Delete"><FiTrash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
