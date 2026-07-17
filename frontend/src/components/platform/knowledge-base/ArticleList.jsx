import { FiFileText, FiEye, FiEdit2, FiTrash2, FiSearch } from 'react-icons/fi';

const STATUS_BADGES = {
  draft: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  published: 'bg-green-100 text-green-700 border-green-200',
  archived: 'bg-gray-100 text-gray-600 border-gray-200',
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

function truncate(str, len = 80) {
  if (!str) return '';
  return str.length > len ? str.substring(0, len) + '...' : str;
}

export default function ArticleList({
  articles,
  loading,
  total,
  page,
  pageSize,
  onPageChange,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onView,
  onEdit,
  onDelete,
  isAdminOrManager,
}) {
  const totalPages = Math.ceil((total || 0) / pageSize);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200/70 shadow-sm p-4 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gray-200" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!articles || articles.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-12">
        <div className="flex flex-col items-center justify-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-50 to-indigo-100 flex items-center justify-center mb-3 shadow-sm">
            <FiFileText className="w-7 h-7 text-indigo-400" />
          </div>
          <h4 className="text-sm font-semibold text-gray-900 mb-1">No articles found</h4>
          <p className="text-xs text-gray-500 text-center max-w-sm">
            {search ? 'Try a different search term or clear filters.' : 'Create your first knowledge base article to get started.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">{total} article{total !== 1 ? 's' : ''}</p>
        <div className="flex items-center gap-2">
          <div className="relative">
            <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search..."
              className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 w-44"
            />
          </div>
          <select
            value={statusFilter || ''}
            onChange={(e) => onStatusFilterChange(e.target.value || null)}
            className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300"
          >
            <option value="">All</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        {articles.map((article) => (
          <div
            key={article.id}
            className="bg-white rounded-xl border border-gray-200/70 shadow-sm p-4 hover:shadow-md hover:border-gray-300/80 transition-all duration-200 group cursor-pointer"
            onClick={() => onView(article)}
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0 mt-0.5">
                <FiFileText className="w-4 h-4 text-indigo-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h4 className="text-sm font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors truncate">{article.title}</h4>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{truncate(article.content, 120)}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <StatusBadge status={article.status} />
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-2.5 text-[10px] text-gray-400">
                  {article.category && (
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                      {article.category.name}
                    </span>
                  )}
                  {article.tags && <span className="truncate max-w-[150px]">#{article.tags.replace(/,/g, ' #')}</span>}
                  <span>v{article.version || 1}</span>
                  <span>{formatDate(article.updated_at || article.created_at)}</span>
                  <span className="flex items-center gap-0.5"><FiEye className="w-3 h-3" />{article.view_count || 0}</span>
                </div>
              </div>
              {isAdminOrManager && (
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); onEdit(article); }}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                    title="Edit"
                  >
                    <FiEdit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(article); }}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all"
                    title="Delete"
                  >
                    <FiTrash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-gray-400">Page {page} of {totalPages}</p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
            >
              Prev
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
              const p = i + 1;
              return (
                <button
                  key={p}
                  onClick={() => onPageChange(p)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    p === page ? 'bg-indigo-600 text-white' : 'border border-gray-200 hover:bg-gray-50 text-gray-600'
                  }`}
                >
                  {p}
                </button>
              );
            })}
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
