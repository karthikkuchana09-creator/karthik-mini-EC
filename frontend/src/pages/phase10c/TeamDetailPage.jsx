import { useState, useCallback, useEffect, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FiUsers, FiUserPlus, FiUserMinus,
  FiActivity, FiInfo, FiExternalLink,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { teamService } from '../../services/teamService';
import { getErrorMessage } from '../../utils/errorHandler';
import Breadcrumb from '../../components/ui/Breadcrumb';
import ConfirmModal from '../../components/common/ConfirmModal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import AddTeamMemberModal from '../../components/workspace/AddTeamMemberModal';

const TABS = [
  { key: 'overview', label: 'Overview', icon: FiInfo },
  { key: 'members', label: 'Members', icon: FiUsers },
  { key: 'workload', label: 'Workload', icon: FiActivity },
];

function MembersTab({ teamId, members, onRefresh, teamName }) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(null);
  const [removing, setRemoving] = useState(false);

  async function handleAddMember(data) {
    try {
      await teamService.addTeamMember(teamId, data);
      toast.success('Member added to team');
      setShowAddModal(false);
      onRefresh();
    } catch (err) {
      throw err;
    }
  }

  async function handleRemoveMember() {
    if (!confirmRemove) return;
    setRemoving(true);
    try {
      await teamService.removeTeamMember(teamId, confirmRemove.user_id || confirmRemove.id);
      toast.success('Member removed from team');
      setConfirmRemove(null);
      onRefresh();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to remove member'));
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900">
          Team Members <span className="text-gray-400 font-normal">({members.length})</span>
        </h3>
        <button onClick={() => setShowAddModal(true)} className="btn-secondary btn-sm">
          <FiUserPlus className="w-3.5 h-3.5" />
          Add Member
        </button>
      </div>

      {members.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
            <FiUsers className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-700">No members yet</p>
          <p className="text-xs text-gray-400 mt-1 mb-4">Add workspace members to this team</p>
          <button onClick={() => setShowAddModal(true)} className="btn-primary btn-sm">
            <FiUserPlus className="w-3.5 h-3.5" />
            Add Member
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Member</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {members.map((member) => {
                const userId = member.user_id || member.id;
                return (
                  <tr key={userId} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                          {(member.name || member.email || '?').charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate max-w-[200px]">
                            {member.name || 'Unnamed User'}
                          </p>
                          <p className="text-xs text-gray-500 truncate max-w-[200px]">{member.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-600 capitalize">{member.role || member.member_role || 'member'}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {member.joined_at || member.created_at
                        ? new Date(member.joined_at || member.created_at).toLocaleDateString()
                        : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        (member.status || 'active') === 'active'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          (member.status || 'active') === 'active' ? 'bg-emerald-500' : 'bg-gray-400'
                        }`} />
                        {member.status || 'active'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setConfirmRemove(member)}
                        className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="Remove member"
                      >
                        <FiUserMinus className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <AddTeamMemberModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddMember}
        teamName={teamName}
      />

      <ConfirmModal
        isOpen={!!confirmRemove}
        onClose={() => setConfirmRemove(null)}
        onConfirm={handleRemoveMember}
        title="Remove Member"
        message={`Are you sure you want to remove ${confirmRemove?.name || confirmRemove?.email || 'this member'} from the team?`}
        confirmText={removing ? 'Removing...' : 'Remove Member'}
        loading={removing}
        variant="danger"
      />
    </div>
  );
}

function OverviewTab({ team }) {
  const stats = [
    { label: 'Status', value: team.is_archived ? 'Archived' : 'Active' },
    { label: 'Members', value: team.member_count ?? '-' },
    { label: 'Lead', value: team.lead || 'Not assigned' },
    { label: 'Created', value: team.created_at ? new Date(team.created_at).toLocaleDateString() : '-' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-lg border border-gray-200 p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
            <p className="text-sm font-semibold text-gray-900">{stat.value}</p>
          </div>
        ))}
      </div>

      {team.description && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Description</h4>
          <p className="text-sm text-gray-700">{team.description}</p>
        </div>
      )}

      {team.metadata && typeof team.metadata === 'object' && Object.keys(team.metadata).length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Metadata</h4>
          <pre className="text-xs text-gray-500 whitespace-pre-wrap">{JSON.stringify(team.metadata, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

function WorkloadTab({ teamId }) {
  const navigate = useNavigate();
  const [workload, setWorkload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!teamId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    import('../../services/workloadService').then(({ workloadService }) => {
      workloadService.getTeamWorkload(teamId)
        .then((data) => { if (!cancelled) setWorkload(data); })
        .catch((err) => { if (!cancelled) setError(getErrorMessage(err, 'Failed to load workload')); })
        .finally(() => { if (!cancelled) setLoading(false); });
    });

    return () => { cancelled = true; };
  }, [teamId]);

  if (loading) return <LoadingSpinner text="Loading workload data..." />;
  if (error) return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
      {error}
    </div>
  );
  if (!workload) return (
    <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
      <FiActivity className="w-8 h-8 text-gray-300 mx-auto mb-3" />
      <p className="text-sm font-medium text-gray-700">No workload data</p>
      <p className="text-xs text-gray-400 mt-1">Workload analytics will appear once tasks are assigned.</p>
    </div>
  );

  const totalTasks = workload.total_tasks ?? workload.totalTasks ?? 0;
  const completedTasks = workload.completed_tasks ?? workload.completedTasks ?? 0;
  const pendingTasks = workload.pending_tasks ?? workload.pendingTasks ?? 0;
  const capacity = workload.capacity ?? 0;
  const utilization = workload.utilization ?? 0;
  const members = workload.members ?? workload.team_members ?? [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Total Tasks</p>
          <p className="text-xl font-bold text-gray-900">{totalTasks}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Completed</p>
          <p className="text-xl font-bold text-emerald-600">{completedTasks}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Pending</p>
          <p className="text-xl font-bold text-amber-600">{pendingTasks}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Utilization</p>
          <p className="text-xl font-bold text-indigo-600">{utilization}%</p>
        </div>
      </div>

      <div className="flex justify-end -mt-3 mb-2">
        <button onClick={() => navigate(`/teams/${teamId}/workload`)}
          className="inline-flex items-center gap-1.5 text-[11px] font-medium text-indigo-600 hover:text-indigo-700 transition-colors">
          View Full Dashboard <FiExternalLink className="w-3 h-3" />
        </button>
      </div>

      {members.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h4 className="text-sm font-semibold text-gray-900">Member Workload Distribution</h4>
          </div>
          <div className="divide-y divide-gray-100">
            {members.map((m, idx) => {
              const taskCount = m.task_count ?? m.tasks ?? 0;
              const maxTasks = Math.max(...members.map((x) => x.task_count ?? x.tasks ?? 0), 1);
              const pct = Math.round((taskCount / maxTasks) * 100);
              return (
                <div key={m.user_id || m.id || idx} className="px-4 py-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0">
                        {(m.name || m.email || '?').charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm text-gray-700 truncate">{m.name || m.email || 'Unknown'}</span>
                    </div>
                    <span className="text-xs text-gray-500 flex-shrink-0 ml-2">{taskCount} tasks</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div
                      className="bg-indigo-500 h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {capacity > 0 && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Capacity Analysis</h4>
          <p className="text-sm text-gray-700">Team capacity: <span className="font-semibold">{capacity} hours</span></p>
          {workload.recommendations?.length > 0 && (
            <div className="mt-2 space-y-1">
              {workload.recommendations.map((rec, i) => (
                <p key={i} className="text-xs text-gray-500 flex items-start gap-1.5">
                  <span className="text-indigo-500 mt-0.5">&bull;</span>
                  {rec}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TabFallback() {
  return (
    <div className="py-8 space-y-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />
      ))}
    </div>
  );
}

export default function TeamDetailPage() {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const tid = Number(teamId);

  const [team, setTeam] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [membersLoading, setMembersLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  const fetchTeam = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await teamService.getTeam(tid);
      setTeam(data);
    } catch (err) {
      if (err?.response?.status === 404) {
        toast.error('Team not found');
        navigate('/teams');
      } else {
        setError(getErrorMessage(err, 'Failed to load team'));
      }
    } finally {
      setLoading(false);
    }
  }, [tid, navigate]);

  const fetchMembers = useCallback(async () => {
    setMembersLoading(true);
    try {
      const data = await teamService.getTeamMembers(tid);
      setMembers(Array.isArray(data) ? data : data?.items || data?.results || []);
    } catch {
      setMembers([]);
    } finally {
      setMembersLoading(false);
    }
  }, [tid]);

  useEffect(() => { fetchTeam(); }, [fetchTeam]);
  useEffect(() => { if (tid) fetchMembers(); }, [tid, fetchMembers]);

  if (loading) return <div className="page-container max-w-5xl"><LoadingSpinner fullPage text="Loading team..." /></div>;
  if (error) return <div className="page-container max-w-5xl"><EmptyState title="Error" message={error} action={<button onClick={fetchTeam} className="btn-secondary btn-sm">Try Again</button>} /></div>;
  if (!team) return null;

  return (
    <div className="page-container max-w-5xl">
      <Breadcrumb
        className="mb-4"
        items={[
          { label: 'Teams', to: '/teams' },
          { label: team.name },
        ]}
      />

      <div className="bg-white rounded-xl border border-gray-200 shadow-card overflow-hidden mb-6">
        <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 px-6 sm:px-8 pt-8 pb-20 sm:pb-24 relative">
          <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\'%3E%3Ccircle cx=\'30\' cy=\'30\' r=\'1\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />
          <div className="flex items-end gap-5 sm:gap-6 relative z-10">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white/15 ring-4 ring-white/40 flex items-center justify-center shadow-xl flex-shrink-0">
              <FiUsers className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
            </div>
            <div className="pb-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-white drop-shadow-sm truncate">
                {team.name}
              </h1>
              <div className="flex items-center flex-wrap gap-2 mt-2">
                <span className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-semibold ${
                  team.is_archived ? 'bg-gray-400/20 text-gray-200' : 'bg-emerald-400/20 text-emerald-100'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${team.is_archived ? 'bg-gray-300' : 'bg-emerald-300'}`} />
                  {team.is_archived ? 'Archived' : 'Active'}
                </span>
                {team.lead && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-white/70">
                    <FiUsers className="w-3.5 h-3.5" /> Lead: {team.lead}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 text-[11px] text-white/70">
                  <FiUsers className="w-3.5 h-3.5" /> {members.length} member{members.length !== 1 ? 's' : ''}
                </span>
              </div>
              {team.description && (
                <p className="text-sm text-white/70 mt-2 max-w-2xl line-clamp-2">{team.description}</p>
              )}
            </div>
          </div>
        </div>

        <div className="px-6 sm:px-8">
          <nav className="flex gap-1 -mt-4 sm:-mt-5 overflow-x-auto scrollbar-hide" aria-label="Team tabs">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-4 sm:px-5 py-3 rounded-t-xl text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-white text-indigo-600 shadow-sm border border-gray-200/70 border-b-white -mb-px z-10'
                      : 'bg-white text-gray-500 hover:text-gray-700 hover:shadow-sm border border-transparent hover:border-gray-200/50'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-gray-200/70 p-6 sm:p-8">
          <Suspense fallback={<TabFallback />}>
            <div key={activeTab} className="animate-fadeSlideIn">
              {activeTab === 'overview' && <OverviewTab team={team} />}
              {activeTab === 'members' && (
                <MembersTab
                  teamId={tid}
                  members={members}
                  onRefresh={fetchMembers}
                  teamName={team.name}
                />
              )}
              {activeTab === 'workload' && <WorkloadTab teamId={tid} />}
            </div>
          </Suspense>
        </div>
      </div>
    </div>
  );
}
