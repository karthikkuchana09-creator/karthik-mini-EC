import { FiFolder, FiEdit2, FiTrash2 } from 'react-icons/fi';

const GRADIENTS = [
  'from-indigo-500 to-violet-500',
  'from-emerald-500 to-teal-500',
  'from-amber-500 to-orange-500',
  'from-rose-500 to-pink-500',
  'from-cyan-500 to-sky-500',
  'from-purple-500 to-indigo-500',
];

export default function KnowledgeCategoryCard({ category, articleCount, onEdit, onDelete, isAdminOrManager, index = 0 }) {
  const gradient = GRADIENTS[index % GRADIENTS.length];

  return (
    <div className="bg-white rounded-xl border border-gray-200/70 shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200">
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-sm shrink-0`}>
            <FiFolder className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-gray-900 truncate">{category.name}</h3>
            {category.description && (
              <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{category.description}</p>
            )}
            <div className="flex items-center gap-2 mt-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                {articleCount ?? category.article_count ?? 0} article{(articleCount ?? category.article_count ?? 0) !== 1 ? 's' : ''}
              </span>
              {category.is_pinned && (
                <span className="text-[10px] font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  Pinned
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {isAdminOrManager && (
        <div className="flex items-center justify-end gap-1 px-4 py-2 bg-gray-50/50 border-t border-gray-100 rounded-b-xl">
          <button onClick={() => onEdit(category)} className="btn-icon" title="Edit category">
            <FiEdit2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onDelete(category)} className="btn-icon hover:!text-red-500" title="Delete category">
            <FiTrash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
