import { useState, useCallback, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FiUsers, FiPlus, FiSearch } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { teamService } from '../../services/teamService';
import { getErrorMessage } from '../../utils/errorHandler';
import LoadingState, { SkeletonCard } from '../../components/phase10c/LoadingState';
import Phase10CEmptyState from '../../components/phase10c/EmptyState';
import Phase10CErrorState from '../../components/phase10c/ErrorState';

const STATUS_COLORS = {
  active: { bg: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  archived: { bg: 'bg-gray-100 text-gray-500', dot: 'bg-gray-400' },
};

export default function TeamsPage() {
  const navigate = useNavigate();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const fetchTeams = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await teamService.getTeams();
      setTeams(Array.isArray(data) ? data : data?.items || data?.results || []);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load teams'));
      toast.error(getErrorMessage(err, 'Failed to load teams'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTeams(); }, [fetchTeams]);

  const filtered = teams.filter((t) => {
    const q = search.toLowerCase();
    if (q && !t.name?.toLowerCase().includes(q) && !t.description?.toLowerCase().includes(q)) return false;
    if (filter === 'active') return t.status !== 'archived';
    if (filter === 'archived') return t.status === 'archived';
    return true;
  });

  const activeCount = teams.filter((t) => t.status !== 'archived').length;
  const archivedCount = teams.filter((t) => t.status === 'archived').length;

  const FILTER_TABS = [
    { key: 'all', label: 'All', count: teams.length },
    { key: 'active', label: 'Active', count: activeCount },
    { key: 'archived', label: 'Archived', count: archivedCount },
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
    return (
      <div className="page-container">
        <Phase10CErrorState message={error} onRetry={fetchTeams} error={error} />
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="page-title">Teams</h1>
          <p className="page-subtitle">Manage teams across your workspace</p>
        </div>
        <button onClick={() => navigate('/teams/new')} className="btn-primary">
          <FiPlus className="w-4 h-4" />
          New Team
        </button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input className="input pl-10" placeholder="Search teams..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
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
          preset={search ? 'noSearchResults' : 'noTeams'}
          action={!search && <button onClick={() => navigate('/teams/new')} className="btn-primary"><FiPlus className="w-4 h-4" />Create Team</button>}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((team) => {
            const cfg = STATUS_COLORS[team.status === 'archived' ? 'archived' : 'active'];
            return (
              <Link
                key={team.id}
                to={`/teams/${team.id}`}
                className="block bg-white rounded-xl border border-gray-200 shadow-card hover:shadow-card-hover hover:border-gray-300 transition-all overflow-hidden group"
              >
                <div className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
                      <FiUsers className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900 truncate group-hover:text-indigo-600 transition-colors">
                        {team.name}
                      </h3>
                      {team.lead && <p className="text-xs text-gray-500 truncate">{team.lead}</p>}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-2 mb-3">{team.description || 'No description'}</p>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${cfg.bg}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                      {team.status || 'active'}
                    </span>
                    {team.member_count !== undefined && (
                      <span className="text-[10px] text-gray-400">{team.member_count} members</span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <div className="mt-4 text-xs text-gray-400 text-center">
        Showing {filtered.length} of {teams.length} team{teams.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}
