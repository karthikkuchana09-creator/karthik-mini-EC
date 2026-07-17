import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getArticles, getCategories, deleteArticle } from '../../api/knowledgeBase';
import { useRolePermissions } from '../../hooks/useRolePermissions';
import { SkeletonTableRows } from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import { FiFileText, FiFolder, FiPlus, FiSearch, FiEdit2, FiTrash2, FiEye } from 'react-icons/fi';

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

const statusColors = { draft: 'bg-yellow-100 text-yellow-800 border-yellow-200', published: 'bg-green-100 text-green-800 border-green-200', archived: 'bg-gray-100 text-gray-800 border-gray-200' };

export default function KnowledgeBase() {
  const { isAdminOrManager } = useRolePermissions();
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const params = { page: 1, size: 50 };
      if (search) params.search = search;
      if (selectedCategory) params.category_id = selectedCategory;
      if (selectedStatus) params.status = selectedStatus;
      const data = await getArticles(params);
      setArticles(data.items || []);
      const cats = await getCategories();
      setCategories(Array.isArray(cats) ? cats : []);
    } catch { setArticles([]); }
    setLoading(false);
  };
  useEffect(() => { load(); }, [selectedCategory, selectedStatus]);

  const handleSearch = (e) => { e.preventDefault(); load(); };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this article?')) return;
    await deleteArticle(id);
    load();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Knowledge Base</h1>
          <p className="text-sm text-gray-500 mt-1">Browse and manage wiki articles</p>
        </div>
        {isAdminOrManager && (
          <Link to="/knowledge-base/new" className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 text-white hover:from-indigo-700 hover:to-indigo-800 transition-all shadow-md">
            <FiPlus className="w-4 h-4" /> New Article
          </Link>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <aside className="lg:w-56 shrink-0">
          <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Categories</h3>
            <button onClick={() => setSelectedCategory('')} className={`w-full text-left px-3 py-2 rounded-lg text-sm mb-1 transition-colors ${!selectedCategory ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>All Categories</button>
            {categories.map(cat => (
              <button key={cat.id} onClick={() => setSelectedCategory(String(cat.id))} className={`w-full text-left px-3 py-2 rounded-lg text-sm mb-1 transition-colors ${selectedCategory === String(cat.id) ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>
                <FiFolder className="w-3.5 h-3.5 inline mr-2" />{cat.name} <span className="text-gray-400 text-xs">({cat.article_count || 0})</span>
              </button>
            ))}
          </div>
        </aside>

        <div className="flex-1 min-w-0">
          <form onSubmit={handleSearch} className="mb-6">
            <div className="relative">
              <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search articles..." className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 bg-gray-50/50" />
            </div>
          </form>

          {loading ? (
            <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm overflow-hidden"><SkeletonTableRows rows={4} cols={4} /></div>
          ) : articles.length === 0 ? (
            <EmptyState title="No articles found" description={search ? 'Try a different search term' : 'Create your first knowledge base article'} />
          ) : (
            <div className="space-y-3">
              {articles.map(article => (
                <div key={article.id} className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <Link to={`/knowledge-base/${article.id}`} className="text-base font-semibold text-gray-900 hover:text-indigo-600 transition-colors">{article.title}</Link>
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">{article.content?.replace(/<[^>]*>/g, '').slice(0, 200)}</p>
                      <div className="flex items-center gap-3 mt-3 text-xs text-gray-400">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusColors[article.status] || statusColors.draft}`}>{article.status}</span>
                        {article.category && <span><FiFolder className="w-3 h-3 inline mr-1" />{article.category.name}</span>}
                        <span><FiEye className="w-3 h-3 inline mr-1" />{article.view_count || 0}</span>
                        <span>{formatDate(article.updated_at)}</span>
                      </div>
                    </div>
                    {isAdminOrManager && (
                      <div className="flex items-center gap-2 shrink-0">
                        <Link to={`/knowledge-base/${article.id}/edit`} className="p-2 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"><FiEdit2 className="w-4 h-4" /></Link>
                        <button onClick={() => handleDelete(article.id)} className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all"><FiTrash2 className="w-4 h-4" /></button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
