import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getArticle, deleteArticle } from '../../api/knowledgeBase';
import { useRolePermissions } from '../../hooks/useRolePermissions';
import { FiArrowLeft, FiEdit2, FiTrash2, FiFolder, FiEye, FiClock } from 'react-icons/fi';

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

const statusColors = { draft: 'bg-yellow-100 text-yellow-800', published: 'bg-green-100 text-green-800', archived: 'bg-gray-100 text-gray-800' };

export default function KnowledgeArticle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdminOrManager } = useRolePermissions();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getArticle(id).then(setArticle).catch(() => navigate('/knowledge-base')).finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    if (!window.confirm('Delete this article?')) return;
    await deleteArticle(id);
    navigate('/knowledge-base');
  };

  if (loading) return <div className="max-w-4xl mx-auto px-4 py-8"><div className="animate-pulse bg-gray-200 rounded-2xl h-96" /></div>;
  if (!article) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to="/knowledge-base" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-indigo-600 mb-6 transition-colors"><FiArrowLeft className="w-4 h-4" />Back to Knowledge Base</Link>

      <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm overflow-hidden">
        <div className="p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-gray-900">{article.title}</h1>
              <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-gray-500">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[article.status] || statusColors.draft}`}>{article.status}</span>
                {article.category && <span><FiFolder className="w-3.5 h-3.5 inline mr-1" />{article.category.name}</span>}
                <span><FiEye className="w-3.5 h-3.5 inline mr-1" />{article.view_count || 0} views</span>
                <span><FiClock className="w-3.5 h-3.5 inline mr-1" />Updated {formatDate(article.updated_at)}</span>
              </div>
              {article.tags && <div className="flex flex-wrap gap-2 mt-3">{article.tags.split(',').map(tag => <span key={tag} className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 text-xs font-medium">{tag.trim()}</span>)}</div>}
            </div>
            {isAdminOrManager && (
              <div className="flex items-center gap-2 shrink-0">
                <Link to={`/knowledge-base/${article.id}/edit`} className="p-2.5 rounded-xl text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"><FiEdit2 className="w-4 h-4" /></Link>
                <button onClick={handleDelete} className="p-2.5 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all"><FiTrash2 className="w-4 h-4" /></button>
              </div>
            )}
          </div>
          <div className="prose prose-sm sm:prose max-w-none prose-headings:text-gray-900 prose-p:text-gray-600 prose-a:text-indigo-600 prose-code:bg-gray-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-pre:bg-gray-900 prose-pre:text-gray-100">
            {article.content.split('\n').map((line, i) => <p key={i}>{line}</p>)}
          </div>
        </div>
      </div>
    </div>
  );
}
