import { useState, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiUsers, FiPlus, FiSearch } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { teamService } from '../../services/teamService';
import { getErrorMessage } from '../../utils/errorHandler';
import { SkeletonCard } from '../../components/phase10c/LoadingState';
import Phase10CEmptyState from '../../components/phase10c/EmptyState';
import Phase10CErrorState from '../../components/phase10c/ErrorState';
import CreateTeamModal from '../../components/workspace/CreateTeamModal';
import EditTeamModal from '../../components/workspace/EditTeamModal';
import ConfirmModal from '../../components/common/ConfirmModal';

const STATUS_COLORS = {
  active: { bg: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  archived: { bg: 'bg-gray-100 text-gray-500', dot: 'bg-gray-400' },
};

export default function TeamsPage() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [archiving, setArchiving] = useState(false);
  const [restoring, setRestoring] = useState(false);

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

  async function handleCreate(data) {
    try {
      await teamService.createTeam(data);
      toast.success('Team created successfully');
      setShowCreateModal(false);
      fetchTeams();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to create team'));
      throw err;
    }
  }

  function openEdit(team) {
    setSelectedTeam(team);
    setShowEditModal(true);
  }

  function handleCloseEdit() {
    setShowEditModal(false);
    setSelectedTeam(null);
  }

  async function handleEdit(data) {
    if (!selectedTeam) return;
    try {
      await teamService.updateTeam(selectedTeam.id, data);
      toast.success('Team updated successfully');
      setShowEditModal(false);
      setSelectedTeam(null);
      fetchTeams();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update team'));
      throw err;
    }
  }

  function openArchive(team) {
    setSelectedTeam(team);
    setShowArchiveConfirm(true);
  }

  async function handleArchive() {
    if (!selectedTeam) return;
    setArchiving(true);
    try {
      await teamService.archiveTeam(selectedTeam.id);
      toast.success('Team archived successfully');
      setShowArchiveConfirm(false);
      setSelectedTeam(null);
      fetchTeams();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to archive team'));
    } finally {
      setArchiving(false);
    }
  }

  function openRestore(team) {
    setSelectedTeam(team);
    setShowRestoreConfirm(true);
  }

  async function handleRestore() {
    if (!selectedTeam) return;
    setRestoring(true);
    try {
      await teamService.restoreTeam(selectedTeam.id);
      toast.success('Team restored successfully');
      setShowRestoreConfirm(false);
      setSelectedTeam(null);
      fetchTeams();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to restore team'));
    } finally {
      setRestoring(false);
    }
  }

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
        <button onClick={() => setShowCreateModal(true)} className="btn-primary">
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
          action={!search && <button onClick={() => setShowCreateModal(true)} className="btn-primary"><FiPlus className="w-4 h-4" />Create Team</button>}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((team) => {
            const isArchived = team.status === 'archived';
            const cfg = STATUS_COLORS[isArchived ? 'archived' : 'active'];
            return (
              <div
                key={team.id}
                className="bg-white rounded-xl border border-gray-200 shadow-card hover:shadow-card-hover hover:border-gray-300 transition-all overflow-hidden group"
              >
                <Link to={`/teams/${team.id}`} className="block p-5 pb-2">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
                      <FiUsers className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900 truncate group-hover:text-indigo-600 transition-colors">
                        {team.name}
                      </h3>
                      {team.lead && <p className="text-xs text-gray-500 truncate">Lead: {team.lead}</p>}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-2 mb-3 min-h-[2rem]">{team.description || 'No description'}</p>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${cfg.bg}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                      {isArchived ? 'Archived' : 'Active'}
                    </span>
                    {team.member_count !== undefined && (
                      <span className="text-[10px] text-gray-400">{team.member_count} members</span>
                    )}
                  </div>
                </Link>
                <div className="flex items-center gap-1 px-5 pb-3 pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Link
                    to={`/teams/${team.id}`}
                    className="px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                  >
                    View
                  </Link>
                  {!isArchived && (
                    <button
                      onClick={() => openEdit(team)}
                      className="px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                    >
                      Edit
                    </button>
                  )}
                  {isArchived ? (
                    <button
                      onClick={() => openRestore(team)}
                      className="px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors"
                    >
                      Restore
                    </button>
                  ) : (
                    <button
                      onClick={() => openArchive(team)}
                      className="px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors"
                    >
                      Archive
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-4 text-xs text-gray-400 text-center">
        Showing {filtered.length} of {teams.length} team{teams.length !== 1 ? 's' : ''}
      </div>

      <CreateTeamModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreate}
      />

      <EditTeamModal
        isOpen={showEditModal}
        onClose={handleCloseEdit}
        onSubmit={handleEdit}
        team={selectedTeam}
      />

      <ConfirmModal
        isOpen={showArchiveConfirm}
        onClose={() => { setShowArchiveConfirm(false); setSelectedTeam(null); }}
        onConfirm={handleArchive}
        title="Archive Team"
        message={`Are you sure you want to archive "${selectedTeam?.name}"? It can be restored later.`}
        confirmText={archiving ? 'Archiving...' : 'Archive Team'}
        loading={archiving}
        variant="warning"
      />

      <ConfirmModal
        isOpen={showRestoreConfirm}
        onClose={() => { setShowRestoreConfirm(false); setSelectedTeam(null); }}
        onConfirm={handleRestore}
        title="Restore Team"
        message={`Restore "${selectedTeam?.name}" to active status?`}
        confirmText={restoring ? 'Restoring...' : 'Restore Team'}
        loading={restoring}
        variant="primary"
      />
    </div>
  );
}
