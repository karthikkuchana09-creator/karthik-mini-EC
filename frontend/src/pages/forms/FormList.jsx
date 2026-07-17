import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getForms, deleteForm } from '../../api/customForms';
import { useRolePermissions } from '../../hooks/useRolePermissions';
import { FiFileText, FiPlus, FiEdit2, FiTrash2, FiEye, FiCopy } from 'react-icons/fi';

const statusColors = { draft: 'bg-yellow-100 text-yellow-800', active: 'bg-green-100 text-green-800', inactive: 'bg-gray-100 text-gray-800' };

export default function FormList() {
  const { isAdminOrManager } = useRolePermissions();
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try { const data = await getForms({ page: 1, size: 50 }); setForms(data.items || []); }
    catch { setForms([]); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this form?')) return;
    await deleteForm(id);
    load();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Custom Forms</h1>
          <p className="text-sm text-gray-500 mt-1">Build and manage dynamic forms</p>
        </div>
        {isAdminOrManager && (
          <Link to="/custom-forms/new" className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 text-white hover:from-indigo-700 hover:to-indigo-800 transition-all shadow-md">
            <FiPlus className="w-4 h-4" /> New Form
          </Link>
        )}
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => <div key={i} className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-5 animate-pulse"><div className="h-4 bg-gray-200 rounded w-3/4 mb-3" /><div className="h-3 bg-gray-200 rounded w-1/2" /></div>)}
        </div>
      ) : forms.length === 0 ? (
        <div className="text-center py-16 bg-white/50 rounded-2xl border border-gray-200/50">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 flex items-center justify-center"><FiFileText className="w-8 h-8 text-gray-400" /></div>
          <p className="text-gray-500 font-semibold">No forms yet</p>
          <p className="text-sm text-gray-400 mt-1">Create your first custom form</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {forms.map(form => (
            <div key={form.id} className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-5 hover:shadow-md transition-shadow group">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-gray-900 truncate">{form.title}</h3>
                  {form.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{form.description}</p>}
                </div>
                <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[form.status] || statusColors.draft}`}>{form.status}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-400 mt-4">
                <span>{form.fields_config?.length || 0} fields</span>
                <span>{form.submission_count || 0} submissions</span>
              </div>
              <div className="flex items-center gap-1 mt-3 pt-3 border-t border-gray-100">
                <Link to={`/custom-forms/${form.id}`} className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all" title="View"><FiEye className="w-4 h-4" /></Link>
                {isAdminOrManager && (
                  <>
                    <Link to={`/custom-forms/${form.id}/edit`} className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all" title="Edit"><FiEdit2 className="w-4 h-4" /></Link>
                    <Link to={`/custom-forms/${form.id}/submissions`} className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all" title="Submissions"><FiCopy className="w-4 h-4" /></Link>
                    <button onClick={() => handleDelete(form.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all" title="Delete"><FiTrash2 className="w-4 h-4" /></button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
