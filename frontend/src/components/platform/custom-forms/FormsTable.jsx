import { FiFileText, FiEdit2, FiTrash2, FiToggleLeft, FiEye } from 'react-icons/fi';

const STATUS_BADGES = {
  active: 'bg-green-100 text-green-700 border-green-200',
  draft: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  inactive: 'bg-gray-100 text-gray-600 border-gray-200',
};

function StatusBadge({ status }) {
  const cls = STATUS_BADGES[status] || STATUS_BADGES.draft;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider border ${cls}`}>
      {status}
    </span>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch { return dateStr; }
}

export default function FormsTable({
  forms,
  loading,
  total,
  search,
  onSearchChange,
  onView,
  onEdit,
  onToggleStatus,
  onDelete,
  isAdminOrManager,
}) {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm overflow-hidden">
        <div className="p-5 space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-4 animate-pulse">
              <div className="w-8 h-8 rounded-lg bg-gray-200" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-100 rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!forms || forms.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-12">
        <div className="flex flex-col items-center justify-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-50 to-indigo-100 flex items-center justify-center mb-3 shadow-sm">
            <FiFileText className="w-7 h-7 text-indigo-400" />
          </div>
          <h4 className="text-sm font-semibold text-gray-900 mb-1">No forms yet</h4>
          <p className="text-xs text-gray-500 text-center max-w-sm">
            {search ? 'No forms match your search.' : 'Create your first custom form to start collecting data.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm overflow-hidden">
      <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
        <p className="text-xs text-gray-400">{total} form{total !== 1 ? 's' : ''}</p>
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search forms..."
          className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 w-44"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Title</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Fields</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Submissions</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Updated</th>
              <th className="text-right px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {forms.map((form) => (
              <tr key={form.id} className="group hover:bg-indigo-50/30 transition-colors">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                      <FiFileText className="w-4 h-4 text-indigo-500" />
                    </div>
                    <div className="min-w-0">
                      <span className="font-medium text-gray-900 truncate block">{form.title}</span>
                      {form.description && (
                        <span className="text-xs text-gray-400 truncate block max-w-[200px]">{form.description}</span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4"><StatusBadge status={form.status} /></td>
                <td className="px-5 py-4 text-xs text-gray-500">{form.fields_config?.length ?? form.field_count ?? 0}</td>
                <td className="px-5 py-4 text-xs text-gray-500">{form.submission_count ?? 0}</td>
                <td className="px-5 py-4 text-xs text-gray-500">{formatDate(form.updated_at)}</td>
                <td className="px-5 py-4 text-right">
                  <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => onView(form)} className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all" title="View form">
                      <FiEye className="w-4 h-4" />
                    </button>
                    {isAdminOrManager && (
                      <>
                        <button onClick={() => onEdit(form)} className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all" title="Edit form">
                          <FiEdit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => onToggleStatus(form)} className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-all" title={form.status === 'active' ? 'Disable form' : 'Activate form'}>
                          <FiToggleLeft className="w-4 h-4" />
                        </button>
                        <button onClick={() => onDelete(form)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all" title="Delete form">
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
