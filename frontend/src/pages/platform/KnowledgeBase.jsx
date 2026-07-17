import { useState, useEffect, useCallback, useRef } from 'react';
import { FiBookOpen, FiFileText, FiFolder, FiTrendingUp, FiPlus, FiRefreshCw } from 'react-icons/fi';
import PlatformPageLayout from '../../components/platform/PlatformPageLayout';
import platformApi from '../../services/platform/platformService';
import { useRolePermissions } from '../../hooks/useRolePermissions';
import CategorySidebar from '../../components/platform/knowledge-base/CategorySidebar';
import ArticleList from '../../components/platform/knowledge-base/ArticleList';
import ArticleViewer from '../../components/platform/knowledge-base/ArticleViewer';
import ArticleEditor from '../../components/platform/knowledge-base/ArticleEditor';

const PAGE_SIZE = 10;

export default function PlatformKnowledgeBase() {
  const { isAdminOrManager } = useRolePermissions();
  const [categories, setCategories] = useState([]);
  const [articles, setArticles] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [catLoading, setCatLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [editingArticle, setEditingArticle] = useState(null);
  const [statCounts, setStatCounts] = useState({ total: 0, categories: 0, mostViewed: 0 });
  const searchRef = useRef('');
  searchRef.current = search;

  const fetchCategories = useCallback(async () => {
    setCatLoading(true);
    try {
      const res = await platformApi.knowledgeBase.categories.list();
      const data = res.data?.items || res.data?.data || res.data || [];
      setCategories(Array.isArray(data) ? data : []);
    } catch { setCategories([]); }
    finally { setCatLoading(false); }
  }, []);

  const fetchArticles = useCallback(async (p, catId) => {
    setLoading(true);
    setError(null);
    try {
      const params = { page: p || page, size: PAGE_SIZE };
      if (catId ?? categoryFilter) params.category_id = catId ?? categoryFilter;
      if (statusFilter) params.status = statusFilter;
      if (searchRef.current) params.search = searchRef.current;
      const res = await platformApi.knowledgeBase.articles.list(params);
      const d = res.data;
      const items = d?.items || d?.data || d || [];
      setArticles(Array.isArray(items) ? items : []);
      setTotal(d?.total || items.length || 0);
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || 'Failed to load articles');
      setArticles([]);
    } finally {
      setLoading(false);
    }
  }, [page, categoryFilter, statusFilter]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await platformApi.knowledgeBase.articles.list({ page: 1, size: 100 });
      const d = res.data;
      const items = d?.items || d?.data || [];
      const list = Array.isArray(items) ? items : [];
      const mostViewed = list.reduce((max, a) => Math.max(max, a.view_count || 0), 0);
      setStatCounts({ total: d?.total || list.length, categories: categories.length, mostViewed });
    } catch { /* stat fetch is best-effort */ }
  }, [categories.length]);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  useEffect(() => {
    if (!catLoading) fetchArticles();
  }, [page, categoryFilter, statusFilter, catLoading, fetchArticles]);

  useEffect(() => {
    if (!catLoading && categories.length > 0) fetchStats();
  }, [catLoading, categories.length, fetchStats]);

  const handleSearchChange = useCallback((val) => {
    setSearch(val);
    searchRef.current = val;
    setPage(1);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchRef.current === search) fetchArticles(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCategorySelect = (catId) => {
    setCategoryFilter(catId);
    setPage(1);
    setSelectedArticle(null);
    setEditingArticle(null);
  };

  const handleView = (article) => {
    setSelectedArticle(article);
    setEditingArticle(null);
  };

  const handleEdit = (article) => {
    setEditingArticle(article);
    setSelectedArticle(null);
  };

  const handleNew = () => {
    setEditingArticle({});
    setSelectedArticle(null);
  };

  const handleBack = () => {
    setSelectedArticle(null);
    setEditingArticle(null);
    fetchArticles(page);
  };

  const handleSave = async (payload) => {
    if (editingArticle?.id) {
      await platformApi.knowledgeBase.articles.update(editingArticle.id, payload);
    } else {
      await platformApi.knowledgeBase.articles.create(payload);
    }
    setEditingArticle(null);
    fetchArticles(1);
    fetchCategories();
    fetchStats();
  };

  const handleDelete = async (article) => {
    if (!window.confirm(`Delete "${article.title}"? This action cannot be undone.`)) return;
    try {
      await platformApi.knowledgeBase.articles.delete(article.id);
      if (selectedArticle?.id === article.id) setSelectedArticle(null);
      fetchArticles(page);
      fetchStats();
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || 'Failed to delete article');
    }
  };

  const handleCategoryCreate = async (data) => {
    await platformApi.knowledgeBase.categories.create(data);
    fetchCategories();
    fetchStats();
  };

  const handleCategoryUpdate = async (id, data) => {
    await platformApi.knowledgeBase.categories.update(id, data);
    fetchCategories();
  };

  const handleCategoryDelete = async (id) => {
    await platformApi.knowledgeBase.categories.delete(id);
    if (categoryFilter === id) setCategoryFilter(null);
    fetchCategories();
    fetchStats();
  };

  const articleCounts = {};
  (articles || []).forEach((a) => {
    if (a.category_id) articleCounts[a.category_id] = (articleCounts[a.category_id] || 0) + 1;
  });

  return (
    <PlatformPageLayout
      title="Knowledge Base"
      subtitle="Centralized enterprise documentation and knowledge management"
      icon={FiBookOpen}
      error={error}
      action={
        <button
          onClick={() => { fetchArticles(page); fetchCategories(); }}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all"
        >
          <FiRefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center shadow-sm">
              <FiFileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Articles</p>
              <p className="text-xl font-bold text-gray-900">{statCounts.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-sm">
              <FiFolder className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Categories</p>
              <p className="text-xl font-bold text-gray-900">{categories.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-sm">
              <FiTrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Most Viewed</p>
              <p className="text-xl font-bold text-gray-900">{statCounts.mostViewed}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        <div className="lg:col-span-1">
          <CategorySidebar
            categories={categories}
            activeCategory={categoryFilter}
            onSelectCategory={handleCategorySelect}
            onCategoryCreate={handleCategoryCreate}
            onCategoryUpdate={handleCategoryUpdate}
            onCategoryDelete={handleCategoryDelete}
            isAdminOrManager={isAdminOrManager}
            articleCounts={articleCounts}
          />
        </div>

        <div className="lg:col-span-3">
          {editingArticle ? (
            <ArticleEditor
              article={editingArticle.id ? editingArticle : null}
              categories={categories}
              onSave={handleSave}
              onCancel={handleBack}
            />
          ) : selectedArticle ? (
            <ArticleViewer
              article={selectedArticle}
              onBack={handleBack}
              onEdit={handleEdit}
              onDelete={handleDelete}
              isAdminOrManager={isAdminOrManager}
            />
          ) : (
            <>
              {isAdminOrManager && (
                <div className="mb-4">
                  <button
                    onClick={handleNew}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-sm font-semibold rounded-xl shadow-md hover:from-indigo-600 hover:to-violet-600 transition-all duration-200"
                  >
                    <FiPlus className="w-4 h-4" />
                    New Article
                  </button>
                </div>
              )}
              <ArticleList
                articles={articles}
                loading={loading}
                total={total}
                page={page}
                pageSize={PAGE_SIZE}
                onPageChange={setPage}
                search={search}
                onSearchChange={handleSearchChange}
                statusFilter={statusFilter}
                onStatusFilterChange={(v) => { setStatusFilter(v); setPage(1); }}
                onView={handleView}
                onEdit={handleEdit}
                onDelete={handleDelete}
                isAdminOrManager={isAdminOrManager}
              />
            </>
          )}
        </div>
      </div>
    </PlatformPageLayout>
  );
}
