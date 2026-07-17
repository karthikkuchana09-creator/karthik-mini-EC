import { useState, useEffect, useCallback } from 'react';
import { FiStar, FiTrash2, FiSearch, FiClock } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import platformApi from '../../services/platform/platformService';
import PlatformPageLayout from '../../components/platform/PlatformPageLayout';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

export default function PlatformSavedSearches() {
  const navigate = useNavigate();
  const [savedSearches, setSavedSearches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await platformApi.search.savedSearches.list({ page: 1, size: 100 });
      setSavedSearches(res.data?.items || res.data?.data || []);
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || 'Failed to load saved searches');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await platformApi.search.savedSearches.delete(deleteTarget.id);
    setSavedSearches((prev) => prev.filter((s) => s.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  const handleRerun = (saved) => {
    const params = new URLSearchParams();
    if (saved.query?.q) params.set('q', saved.query.q);
    navigate(`/platform/search?${params.toString()}`);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    } catch { return dateStr; }
  };

  return (
    <PlatformPageLayout
      title="Saved Searches"
      subtitle="Manage your saved search queries for quick access"
      icon={FiStar}
      loading={loading}
      error={error}
      empty={!loading && !error && savedSearches.length === 0}
      emptyTitle="No saved searches"
      emptyDescription="Save searches from the Global Search page to quickly rerun them later."
      loadingCount={4}
    >
      <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Query</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Modules</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Created</th>
                <th className="text-right px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {savedSearches.map((s) => (
                <tr key={s.id} className="group hover:bg-indigo-50/30 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
                        <FiStar className="w-4 h-4 text-amber-500" />
                      </div>
                      <span className="font-medium text-gray-900">{s.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <code className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded max-w-[200px] block truncate">
                      {s.query?.q || '-'}
                    </code>
                  </td>
                  <td className="px-5 py-4">
                    {s.query?.entity_types && s.query.entity_types.length > 0 ? (
                      <span className="text-xs text-gray-500">{s.query.entity_types.length} selected</span>
                    ) : (
                      <span className="text-xs text-gray-400">All</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <FiClock className="w-3.5 h-3.5 text-gray-300" />
                      {formatDate(s.created_at || s.createdAt)}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleRerun(s)}
                        className="p-2 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                        title="Run search"
                      >
                        <FiSearch className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(s)}
                        className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all"
                        title="Delete saved search"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {savedSearches.length > 0 && (
          <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/30">
            <p className="text-xs text-gray-400">{savedSearches.length} saved search{savedSearches.length !== 1 ? 'es' : ''}</p>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Saved Search"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />
    </PlatformPageLayout>
  );
}
