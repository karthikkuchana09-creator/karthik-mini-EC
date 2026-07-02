import { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiPlus, FiUsers, FiGrid, FiList, FiSearch } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { teamService } from '../../services/teamService';
import { getErrorMessage } from '../../utils/errorHandler';
import {
  CARD_NO_HOVER,
  BTN_PRIMARY,
  INPUT_CLASSES,
} from '../../config/ui';
import CreateTeamModal from '../../components/workspace/CreateTeamModal';
import EditTeamModal from '../../components/workspace/EditTeamModal';
import TeamCard from '../../components/workspace/TeamCard';
import TeamTable from '../../components/workspace/TeamTable';
import ConfirmModal from '../../components/common/ConfirmModal';
import Breadcrumb from '../../components/ui/Breadcrumb';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import Phase10CErrorState from '../../components/phase10c/ErrorState';

const FILTER_TABS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'archived', label: 'Archived' },
];

export default function Teams() {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const wId = Number(workspaceId);

  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [viewMode, setViewMode] = useState('card');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [archiving, setArchiving] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const fetchTeams = useCallback(async () => {
    setLoading(true);
    try {
      const data = await teamService.getWorkspaceTeams(wId);
      setTeams(Array.isArray(data) ? data : data?.items || data?.results || []);
    } catch (err) {
      const msg = getErrorMessage(err, 'Failed to load teams');
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [wId]);

  useEffect(() => { if (wId) fetchTeams(); }, [fetchTeams, wId]);

  const filtered = teams.filter((t) => {
    const q = search.toLowerCase();
    if (q && !t.name?.toLowerCase().includes(q) && !t.description?.toLowerCase().includes(q)) return false;
    if (filter === 'active') return t.status !== 'archived';
    if (filter === 'archived') return t.status === 'archived';
    return true;
  });

  async function handleCreate(data) {
    try {
      await teamService.createWorkspaceTeam(wId, data);
      toast.success('Team created successfully');
      fetchTeams();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to create team'));
      throw err;
    }
  }

  async function handleEdit(data) {
    if (!selectedTeam) return;
    try {
      await teamService.updateWorkspaceTeam(wId, selectedTeam.id, data);
      toast.success('Team updated successfully');
      setSelectedTeam(null);
      fetchTeams();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update team'));
      throw err;
    }
  }

  function openEdit(team) {
    setSelectedTeam(team);
    setShowEditModal(true);
  }

  function openArchive(team) {
    setSelectedTeam(team);
    setShowArchiveConfirm(true);
  }

  async function handleArchive() {
    if (!selectedTeam) return;
    setArchiving(true);
    try {
      await teamService.archiveWorkspaceTeam(wId, selectedTeam.id);
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
      await teamService.restoreWorkspaceTeam(wId, selectedTeam.id);
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

  function handleView(team) {
    navigate(`/workspaces/${wId}/teams/${team.id}`);
  }

  function handleCloseEdit() {
    setShowEditModal(false);
    setSelectedTeam(null);
  }

  const activeCount = teams.filter((t) => t.status !== 'archived').length;
  const archivedCount = teams.filter((t) => t.status === 'archived').length;

  return (
    <div className="page-container">
      <Breadcrumb
        className="mb-4"
        items={[
          { label: 'Workspaces', to: '/workspaces' },
          { label: `Workspace #${wId}`, to: `/workspaces/${wId}` },
          { label: 'Teams' },
        ]}
      />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <FiUsers className="w-6 h-6 text-indigo-500" />
            Teams
          </h1>
          <p className="page-subtitle">Manage teams within this workspace</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className={BTN_PRIMARY}>
          <FiPlus className="w-4 h-4" />
          New Team
        </button>
      </div>

      <div className={`${CARD_NO_HOVER} p-4 mb-6`}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              className={`${INPUT_CLASSES} pl-10`}
              placeholder="Search teams..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
              {FILTER_TABS.map((tab) => {
                const count =
                  tab.key === 'all' ? teams.length
                    : tab.key === 'active' ? activeCount
                    : archivedCount;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setFilter(tab.key)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap ${
                      filter === tab.key
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tab.label}
                    <span className="ml-1 text-gray-400">({count})</span>
                  </button>
                );
              })}
            </div>
            <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('card')}
                className={`p-1.5 rounded-md transition-all ${
                  viewMode === 'card'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
                title="Card view"
              >
                <FiGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-md transition-all ${
                  viewMode === 'table'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
                title="Table view"
              >
                <FiList className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner fullPage text="Loading teams..." />
      ) : error ? (
        <Phase10CErrorState message={error} onRetry={fetchTeams} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={search ? 'No matching teams' : 'No teams yet'}
          message={
            search
              ? 'Try a different search term'
              : 'Create your first team in this workspace to get started.'
          }
          action={
            !search && (
              <button onClick={() => setShowCreateModal(true)} className={BTN_PRIMARY}>
                <FiPlus className="w-4 h-4" />
                Create Team
              </button>
            )
          }
        />
      ) : viewMode === 'card' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((team) => (
            <TeamCard
              key={team.id}
              team={team}
              onView={handleView}
              onEdit={openEdit}
              onArchive={openArchive}
              onRestore={openRestore}
            />
          ))}
        </div>
      ) : (
        <TeamTable
          teams={filtered}
          loading={false}
          onView={handleView}
          onEdit={openEdit}
          onArchive={openArchive}
          onRestore={openRestore}
        />
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
