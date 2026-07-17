import { FiFileText, FiEye, FiClock, FiUser } from 'react-icons/fi';

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-600 border-gray-200',
  published: 'bg-green-100 text-green-700 border-green-200',
  archived: 'bg-red-50 text-red-600 border-red-200',
};

export default function KnowledgeArticleCard({ article, onClick, isAdminOrManager }) {
  const statusColor = STATUS_COLORS[article.status] || STATUS_COLORS.draft;

  return (
    <button
      onClick={() => onClick(article)}
      className="w-full text-left bg-white rounded-xl border border-gray-200/70 shadow-sm p-4 hover:shadow-md hover:border-gray-300 transition-all duration-200 group"
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-sm shrink-0 mt-0.5">
          <FiFileText className="w-4 h-4 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusColor}`}>
              {article.status}
            </span>
            {article.category_name && (
              <span className="text-[10px] text-gray-400">{article.category_name}</span>
            )}
          </div>
          <h3 className="text-sm font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors truncate">
            {article.title}
          </h3>
          {article.excerpt && (
            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{article.excerpt}</p>
          )}
          <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-400">
            {article.author_name && (
              <span className="flex items-center gap-1">
                <FiUser className="w-3 h-3" />
                {article.author_name}
              </span>
            )}
            {article.view_count > 0 && (
              <span className="flex items-center gap-1">
                <FiEye className="w-3 h-3" />
                {article.view_count}
              </span>
            )}
            <span className="flex items-center gap-1">
              <FiClock className="w-3 h-3" />
              {new Date(article.updated_at || article.created_at).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric',
              })}
            </span>
            {article.tags && article.tags.length > 0 && (
              <span className="text-gray-300">·</span>
            )}
            {article.tags?.slice(0, 2).map((tag) => (
              <span key={tag} className="text-[10px] text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </button>
  );
}
