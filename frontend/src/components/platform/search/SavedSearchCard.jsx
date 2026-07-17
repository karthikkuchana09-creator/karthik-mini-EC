import { FiStar, FiSearch, FiTrash2, FiExternalLink } from 'react-icons/fi';

export default function SavedSearchCard({ search, onRun, onDelete, isAdminOrManager }) {
  const moduleCount = search.modules?.length || 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200/70 shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200">
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm shrink-0">
            <FiStar className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-gray-900 truncate">{search.name}</h3>
            {search.description && (
              <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{search.description}</p>
            )}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="text-[10px] font-medium text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-200">
                {search.query}
              </span>
              {moduleCount > 0 && (
                <span className="text-[10px] text-gray-400">
                  {moduleCount} module{moduleCount > 1 ? 's' : ''}
                </span>
              )}
              <span className="text-[10px] text-gray-400">
                {new Date(search.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-1 px-4 py-2 bg-gray-50/50 border-t border-gray-100 rounded-b-xl">
        <button
          onClick={() => onRun(search)}
          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
          title="Run this search"
        >
          <FiSearch className="w-3 h-3" />
          Run
        </button>
        {isAdminOrManager && (
          <button
            onClick={() => onDelete(search)}
            className="btn-icon hover:!text-red-500"
            title="Delete saved search"
          >
            <FiTrash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
