import { useState, useCallback, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { FiUsers, FiPlus, FiUser, FiCalendar, FiX, FiChevronDown, FiSearch } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { projectService } from '../../services/projectService';
import { teamService } from '../../services/teamService';
import { getErrorMessage } from '../../utils/errorHandler';
import Modal from '../../components/ui/Modal';
import ConfirmModal from '../../components/common/ConfirmModal';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export default function ProjectTeamsPage() {
  const { projectId } = useParams();
  const pid = Number(projectId);

  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [adding, setAdding] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(null);
  const [removing, setRemoving] = useState(false);

  const [allTeams, setAllTeams] = useState([]);
  const [allTeamsLoading, setAllTeamsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const searchRef = useRef(null);

  const q = searchQuery.toLowerCase();
  const filteredTeams = allTeams.filter((t) =>
    t.name?.toLowerCase().includes(q) || t.lead?.toLowerCase().includes(q)
  );

  const fetchTeams = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await projectService.getProjectTeams(pid);
      setTeams(Array.isArray(data) ? data : data?.items || data?.results || []);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load project teams'));
      toast.error(getErrorMessage(err, 'Failed to load project teams'));
    } finally {
      setLoading(false);
    }
  }, [pid]);

  useEffect(() => { fetchTeams(); }, [fetchTeams]);

  useEffect(() => {
    if (!showAddModal) {
      setSelectedTeam(null);
      setSearchQuery('');
      setDropdownOpen(false);
    }
  }, [showAddModal]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (dropdownOpen && searchRef.current) {
      searchRef.current.focus();
    }
  }, [dropdownOpen]);

  async function openAddModal() {
    setShowAddModal(true);
    setAllTeamsLoading(true);
    try {
      const data = await teamService.getTeams();
      const all = Array.isArray(data) ? data : data?.items || data?.results || [];
      const assignedIds = new Set(teams.map((t) => t.id));
      setAllTeams(all.filter((t) => !assignedIds.has(t.id)));
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load available teams'));
      setAllTeams([]);
    } finally {
      setAllTeamsLoading(false);
    }
  }

  async function handleAddTeam() {
    if (!selectedTeam) return;
    setAdding(true);
    try {
      await projectService.addProjectTeam(pid, { team_id: selectedTeam.id });
      toast.success(`"${selectedTeam.name}" assigned to project`);
      setShowAddModal(false);
      setSelectedTeam(null);
      setSearchQuery('');
      fetchTeams();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to assign team'));
    } finally {
      setAdding(false);
    }
  }

  async function handleRemoveTeam() {
    if (!confirmRemove) return;
    setRemoving(true);
    try {
      await projectService.removeProjectTeam(pid, confirmRemove.id);
      toast.success(`"${confirmRemove.name}" removed from project`);
      setConfirmRemove(null);
      fetchTeams();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to remove team'));
    } finally {
      setRemoving(false);
    }
  }

  if (loading) return <div className="py-8"><LoadingSpinner text="Loading teams..." /></div>;
  if (error) return (
    <div className="py-8">
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700 flex items-center justify-between">
        <span>{error}</span>
        <button onClick={fetchTeams} className="text-xs font-medium text-red-700 underline hover:no-underline">Retry</button>
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <FiUsers className="w-4 h-4 text-gray-500" />
          Assigned Teams <span className="text-gray-400 font-normal">({teams.length})</span>
        </h3>
        <button onClick={openAddModal} className="btn-secondary btn-sm">
          <FiPlus className="w-3.5 h-3.5" /> Assign Team
        </button>
      </div>

      {teams.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
            <FiUsers className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-700">No teams assigned</p>
          <p className="text-xs text-gray-400 mt-1 mb-4">Assign teams to collaborate on this project</p>
          <button onClick={openAddModal} className="btn-primary btn-sm">
            <FiPlus className="w-3.5 h-3.5" /> Assign Team
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Team Name</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Lead</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Members</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned Date</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {teams.map((team) => (
                <tr key={team.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                        <FiUsers className="w-4 h-4 text-indigo-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate max-w-[200px]">{team.name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 text-sm text-gray-600">
                      <FiUser className="w-3.5 h-3.5 text-gray-400" />
                      <span className="truncate max-w-[150px]">{team.lead || team.lead_name || 'Not assigned'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-600">{team.member_count ?? '-'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 text-sm text-gray-500">
                      <FiCalendar className="w-3.5 h-3.5 text-gray-400" />
                      <span>{team.assigned_date || team.created_at ? new Date(team.assigned_date || team.created_at).toLocaleDateString() : '-'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setConfirmRemove(team)}
                      className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      title="Remove team"
                    >
                      <FiX className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Assign Team to Project" size="md">
        <div className="space-y-4">
          <div className="relative" ref={dropdownRef}>
            <label className="label-required">Select Team</label>
            <button
              type="button"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className={`input flex items-center justify-between w-full ${selectedTeam ? 'text-gray-900' : 'text-gray-400'}`}
            >
              <span className="truncate">{selectedTeam ? selectedTeam.name : 'Search and select a team...'}</span>
              <FiChevronDown className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ml-2 ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {dropdownOpen && (
              <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-hidden">
                <div className="p-2 border-b border-gray-100">
                  <div className="relative">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                    <input
                      ref={searchRef}
                      type="text"
                      className="input pl-9 py-1.5 text-sm"
                      placeholder="Search teams..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
                <div className="overflow-y-auto max-h-48">
                  {allTeamsLoading ? (
                    <div className="p-4 text-center text-sm text-gray-400">Loading teams...</div>
                  ) : (
                    <>
                      {filteredTeams.length === 0 ? (
                        <div className="p-4 text-center text-sm text-gray-400">
                          {searchQuery ? 'No teams match your search' : 'No teams available'}
                        </div>
                      ) : (
                        filteredTeams.map((team) => (
                          <button
                            key={team.id}
                            type="button"
                            onClick={() => { setSelectedTeam(team); setDropdownOpen(false); setSearchQuery(''); }}
                            className="w-full px-3 py-2.5 text-sm text-left hover:bg-indigo-50 transition-colors flex items-center gap-3"
                          >
                            <div className="w-7 h-7 rounded-md bg-indigo-50 flex items-center justify-center flex-shrink-0">
                              <FiUsers className="w-3.5 h-3.5 text-indigo-600" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{team.name}</p>
                              <p className="text-[11px] text-gray-500">{team.member_count ?? 0} members{team.lead ? ` · Lead: ${team.lead}` : ''}</p>
                            </div>
                          </button>
                        ))
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 mt-4 border-t border-gray-100">
            <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary" disabled={adding}>
              Cancel
            </button>
            <button type="button" onClick={handleAddTeam} disabled={!selectedTeam || adding} className="btn-primary">
              {adding ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Assigning...
                </span>
              ) : 'Assign Team'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={!!confirmRemove}
        onClose={() => setConfirmRemove(null)}
        onConfirm={handleRemoveTeam}
        title="Remove Team"
        message={`Are you sure you want to remove "${confirmRemove?.name}" from this project?`}
        confirmText={removing ? 'Removing...' : 'Remove Team'}
        loading={removing}
        variant="danger"
      />
    </div>
  );
}


