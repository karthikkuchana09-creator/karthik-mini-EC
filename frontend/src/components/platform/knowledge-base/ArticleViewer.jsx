import { useState } from 'react';
import { FiArrowLeft, FiEdit2, FiTrash2, FiEye, FiClock, FiHash, FiLayers, FiUser, FiBookOpen } from 'react-icons/fi';

const STATUS_BADGES = {
  draft: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  published: 'bg-green-100 text-green-700 border-green-200',
  archived: 'bg-gray-100 text-gray-600 border-gray-200',
};

function formatDate(dateStr) {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return dateStr; }
}

export default function ArticleViewer({ article, onBack, onEdit, onDelete, isAdminOrManager }) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!article) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-12 flex flex-col items-center justify-center">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-50 to-indigo-100 flex items-center justify-center mb-3 shadow-sm">
          <FiBookOpen className="w-7 h-7 text-indigo-400" />
        </div>
        <h4 className="text-sm font-semibold text-gray-900 mb-1">Select an article</h4>
        <p className="text-xs text-gray-500 text-center max-w-sm">Choose an article from the list to view its contents.</p>
      </div>
    );
  }

  const handleDelete = () => {
    if (confirmDelete) {
      onDelete(article);
      setConfirmDelete(false);
    } else {
      setConfirmDelete(true);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm overflow-hidden">
      <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-indigo-600 transition-colors font-medium"
        >
          <FiArrowLeft className="w-3.5 h-3.5" />
          Back to list
        </button>
        <div className="flex items-center gap-1.5">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider border ${
            STATUS_BADGES[article.status] || STATUS_BADGES.draft
          }`}>
            {article.status}
          </span>
        </div>
      </div>

      <div className="px-6 py-5">
        <h2 className="text-xl font-bold text-gray-900 mb-3">{article.title}</h2>

        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400 mb-5 pb-4 border-b border-gray-100">
          <span className="flex items-center gap-1.5">
            <FiUser className="w-3.5 h-3.5" />
            Author #{article.author_id}
          </span>
          <span className="flex items-center gap-1.5">
            <FiClock className="w-3.5 h-3.5" />
            Updated {formatDate(article.updated_at)}
          </span>
          <span className="flex items-center gap-1.5">
            <FiEye className="w-3.5 h-3.5" />
            {article.view_count || 0} views
          </span>
          <span className="flex items-center gap-1.5">
            <FiLayers className="w-3.5 h-3.5" />
            v{article.version || 1}
          </span>
          {article.category && (
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-400" />
              {article.category.name}
            </span>
          )}
        </div>

        {article.tags && (
          <div className="flex items-center gap-2 mb-5">
            <FiHash className="w-3.5 h-3.5 text-gray-400" />
            {article.tags.split(',').map((tag, i) => (
              <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-indigo-50 text-indigo-600 border border-indigo-100">
                {tag.trim()}
              </span>
            ))}
          </div>
        )}

        <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap">
          {article.content}
        </div>
      </div>

      {isAdminOrManager && (
        <div className="px-6 py-3 bg-gray-50/50 border-t border-gray-100 flex items-center justify-end gap-2">
          <button
            onClick={() => onEdit(article)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-xl hover:bg-indigo-100 transition-colors"
          >
            <FiEdit2 className="w-3.5 h-3.5" />
            Edit
          </button>
          <button
            onClick={handleDelete}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl transition-colors ${
              confirmDelete
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'text-red-600 bg-red-50 border border-red-200 hover:bg-red-100'
            }`}
          >
            <FiTrash2 className="w-3.5 h-3.5" />
            {confirmDelete ? 'Confirm Delete?' : 'Delete'}
          </button>
        </div>
      )}
    </div>
  );
}
