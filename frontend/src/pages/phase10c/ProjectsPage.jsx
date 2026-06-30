import { useState, useCallback, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FiFolder, FiPlus, FiSearch, FiUsers, FiTarget } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { projectService } from '../../services/projectService';
import { getErrorMessage } from '../../utils/errorHandler';
import { PROJECT_STATUS_CONFIG } from '../../utils/phase10cConstants';
import LoadingState, { SkeletonCard } from '../../components/phase10c/LoadingState';
import Phase10CEmptyState from '../../components/phase10c/EmptyState';
import Phase10CErrorState from '../../components/phase10c/ErrorState';

export default function ProjectsPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await projectService.getProjects();
      setProjects(Array.isArray(data) ? data : data?.items || data?.results || []);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load projects'));
      toast.error(getErrorMessage(err, 'Failed to load projects'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const filtered = projects.filter((p) => {
    const q = search.toLowerCase();
    if (q && !p.name?.toLowerCase().includes(q) && !p.description?.toLowerCase().includes(q)) return false;
    if (filter !== 'all') return p.status === filter;
    return true;
  });

  const FILTER_TABS = [
    { key: 'all', label: 'All', count: projects.length },
    { key: 'active', label: 'Active', count: projects.filter((p) => p.status === 'active').length },
    { key: 'on_hold', label: 'On Hold', count: projects.filter((p) => p.status === 'on_hold').length },
    { key: 'completed', label: 'Completed', count: projects.filter((p) => p.status === 'completed').length },
    { key: 'archived', label: 'Archived', count: projects.filter((p) => p.status === 'archived').length },
  ];

  if (loading) {
    return (
      <div className="page-container">
        <div className="flex items-center justify-between mb-6">
          <div className="h-8 bg-gray-200 rounded w-48 animate-pulse" />
          <div className="h-10 bg-gray-200 rounded-lg w-32 animate-pulse" />
        </div>
        <SkeletonCard count={6} />
      </div>
    );
  }

  if (error) {
    return <div className="page-container"><Phase10CErrorState message={error} onRetry={fetchProjects} error={error} /></div>;
  }

  return (
    <div className="page-container">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="page-title">Projects</h1>
          <p className="page-subtitle">Manage projects and their associated resources</p>
        </div>
        <button onClick={() => navigate('/projects/new')} className="btn-primary">
          <FiPlus className="w-4 h-4" />
          New Project
        </button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input className="input pl-10" placeholder="Search projects..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex items-center bg-gray-100 rounded-lg p-0.5 overflow-x-auto">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap ${
                filter === tab.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
              <span className="ml-1 text-gray-400">({tab.count})</span>
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <Phase10CEmptyState
          preset={search ? 'noSearchResults' : 'noProjects'}
          action={!search && <button onClick={() => navigate('/projects/new')} className="btn-primary"><FiPlus className="w-4 h-4" />Create Project</button>}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((project) => {
            const statusCfg = PROJECT_STATUS_CONFIG[project.status] || PROJECT_STATUS_CONFIG.active;
            return (
              <Link
                key={project.id}
                to={`/projects/${project.id}`}
                className="block bg-white rounded-xl border border-gray-200 shadow-card hover:shadow-card-hover hover:border-gray-300 transition-all overflow-hidden group"
              >
                <div className="h-2 bg-gradient-to-r from-indigo-500 to-indigo-600" />
                <div className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
                      <FiFolder className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900 truncate group-hover:text-indigo-600 transition-colors">
                        {project.name}
                      </h3>
                      <span className={`inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-full ${statusCfg.badge}`}>
                        {statusCfg.label}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-2 mb-3">{project.description || 'No description'}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    {project.team_count !== undefined && (
                      <span className="inline-flex items-center gap-1"><FiUsers className="w-3.5 h-3.5" />{project.team_count} teams</span>
                    )}
                    {project.task_count !== undefined && (
                      <span className="inline-flex items-center gap-1"><FiTarget className="w-3.5 h-3.5" />{project.task_count} tasks</span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <div className="mt-4 text-xs text-gray-400 text-center">
        Showing {filtered.length} of {projects.length} project{projects.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}
