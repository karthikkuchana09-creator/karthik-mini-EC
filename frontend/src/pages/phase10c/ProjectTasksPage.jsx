import { useState, useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  FiTarget, FiPlus, FiEdit2, FiTrash2, FiUser, FiEye,
  FiCalendar, FiGrid, FiList, FiSearch, FiClock, FiCheckCircle,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { projectService } from '../../services/projectService';
import { teamService } from '../../services/teamService';
import { getErrorMessage } from '../../utils/errorHandler';
import { CARD_NO_HOVER, INPUT_CLASSES } from '../../config/ui';
import Modal from '../../components/ui/Modal';
import ConfirmModal from '../../components/common/ConfirmModal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';

const STATUS_OPTIONS = [
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'review', label: 'Review' },
  { value: 'done', label: 'Done' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

const STATUS_STYLE = {
  todo: 'bg-yellow-50 text-yellow-700 border-yellow-200 dot:bg-yellow-500',
  in_progress: 'bg-blue-50 text-blue-700 border-blue-200 dot:bg-blue-500',
  review: 'bg-purple-50 text-purple-700 border-purple-200 dot:bg-purple-500',
  done: 'bg-emerald-50 text-emerald-700 border-emerald-200 dot:bg-emerald-500',
};

const PRIORITY_STYLE = {
  low: { bg: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' },
  medium: { bg: 'bg-orange-50 text-orange-700', dot: 'bg-orange-500' },
  high: { bg: 'bg-red-50 text-red-700', dot: 'bg-red-500' },
};

function statusColor(status) {
  const m = { todo: 'bg-yellow-400', in_progress: 'bg-blue-400', review: 'bg-purple-400', done: 'bg-emerald-400' };
  return m[status] || 'bg-gray-300';
}

function progressFromStatus(status) {
  const m = { todo: 0, in_progress: 40, review: 70, done: 100 };
  return m[status] ?? 0;
}

export default function ProjectTasksPage() {
  const { projectId } = useParams();
  const pid = Number(projectId);

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('table');
  const [search, setSearch] = useState('');

  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterTeam, setFilterTeam] = useState('');
  const [filterUser, setFilterUser] = useState('');

  const [projectTeams, setProjectTeams] = useState([]);
  const [teamMembers, setTeamMembers] = useState({});

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formPriority, setFormPriority] = useState('medium');
  const [formStatus, setFormStatus] = useState('todo');
  const [formTeamId, setFormTeamId] = useState('');
  const [formAssigneeId, setFormAssigneeId] = useState('');
  const [formDueDate, setFormDueDate] = useState('');

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await projectService.getProjectTasks(pid);
      setTasks(Array.isArray(data) ? data : data?.items || data?.results || []);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load tasks'));
      toast.error(getErrorMessage(err, 'Failed to load tasks'));
    } finally {
      setLoading(false);
    }
  }, [pid]);

  const fetchProjectTeams = useCallback(async () => {
    try {
      const data = await projectService.getProjectTeams(pid);
      const teams = Array.isArray(data) ? data : data?.items || data?.results || [];
      setProjectTeams(teams);
      const memberMap = {};
      await Promise.all(teams.map(async (t) => {
        try {
          const m = await teamService.getTeamMembers(t.id);
          memberMap[t.id] = Array.isArray(m) ? m : m?.items || m?.results || [];
        } catch { memberMap[t.id] = []; }
      }));
      setTeamMembers(memberMap);
    } catch { /* non-critical */ }
  }, [pid]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);
  useEffect(() => { fetchProjectTeams(); }, [fetchProjectTeams]);

  const allMembers = Object.values(teamMembers).flat();
  const uniqueUsers = allMembers.filter((u, i, a) => a.findIndex((x) => (x.id || x.user_id) === (u.id || u.user_id)) === i);

  const filteredTasks = tasks.filter((t) => {
    const q = search.toLowerCase();
    if (q && !t.title?.toLowerCase().includes(q) && !t.description?.toLowerCase().includes(q)) return false;
    if (filterStatus && t.status !== filterStatus) return false;
    if (filterPriority && t.priority !== filterPriority) return false;
    if (filterTeam && (t.team_id || t.team?.id) !== Number(filterTeam)) return false;
    if (filterUser && (t.assigned_to || t.assignee_id || t.assignee?.id) !== Number(filterUser)) return false;
    return true;
  });

  function resetForm() {
    setFormTitle('');
    setFormDesc('');
    setFormPriority('medium');
    setFormStatus('todo');
    setFormTeamId('');
    setFormAssigneeId('');
    setFormDueDate('');
  }

  function openCreate() {
    resetForm();
    setShowCreateModal(true);
  }

  function openEdit(task) {
    setSelectedTask(task);
    setFormTitle(task.title || '');
    setFormDesc(task.description || '');
    setFormPriority(task.priority || 'medium');
    setFormStatus(task.status || 'todo');
    setFormTeamId(task.team_id || task.team?.id || '');
    setFormAssigneeId(task.assigned_to || task.assignee_id || task.assignee?.id || '');
    setFormDueDate(task.due_date ? task.due_date.slice(0, 10) : '');
    setShowEditModal(true);
  }

  function openView(task) {
    setSelectedTask(task);
    setShowViewModal(true);
  }

  function openDelete(task) {
    setSelectedTask(task);
    setShowDeleteConfirm(true);
  }

  async function handleCreate() {
    if (!formTitle.trim()) return;
    setSaving(true);
    try {
      await projectService.createProjectTask(pid, {
        title: formTitle.trim(),
        description: formDesc.trim(),
        priority: formPriority,
        status: formStatus,
        team_id: formTeamId || undefined,
        assigned_to: formAssigneeId || undefined,
        due_date: formDueDate || undefined,
      });
      toast.success('Task created');
      setShowCreateModal(false);
      resetForm();
      fetchTasks();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to create task'));
    } finally {
      setSaving(false);
    }
  }

  async function handleEdit() {
    if (!selectedTask || !formTitle.trim()) return;
    setSaving(true);
    try {
      await projectService.updateProjectTask(pid, selectedTask.id, {
        title: formTitle.trim(),
        description: formDesc.trim(),
        priority: formPriority,
        status: formStatus,
        team_id: formTeamId || undefined,
        assigned_to: formAssigneeId || undefined,
        due_date: formDueDate || undefined,
      });
      toast.success('Task updated');
      setShowEditModal(false);
      setSelectedTask(null);
      resetForm();
      fetchTasks();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update task'));
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(taskId, newStatus) {
    try {
      await projectService.updateProjectTaskStatus(pid, taskId, newStatus);
      toast.success('Status updated');
      fetchTasks();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update status'));
    }
  }

  async function handleDelete() {
    if (!selectedTask) return;
    setDeleting(true);
    try {
      await projectService.deleteProjectTask(pid, selectedTask.id);
      toast.success('Task deleted');
      setShowDeleteConfirm(false);
      setSelectedTask(null);
      fetchTasks();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete task'));
    } finally {
      setDeleting(false);
    }
  }

  if (loading) return <div className="py-8"><LoadingSpinner text="Loading tasks..." /></div>;
  if (error) return (
    <div className="py-8">
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700 flex items-center justify-between">
        <span>{error}</span>
        <button onClick={fetchTasks} className="text-xs font-medium text-red-700 underline hover:no-underline">Retry</button>
      </div>
    </div>
  );

  const allAssigneeIds = new Set(uniqueUsers.map((u) => u.id || u.user_id));

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <FiTarget className="w-4 h-4 text-gray-500" />
          Tasks <span className="text-gray-400 font-normal">({filteredTasks.length})</span>
        </h3>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
            <button onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'table' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
              title="Table view"><FiList className="w-3.5 h-3.5" /></button>
            <button onClick={() => setViewMode('card')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'card' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
              title="Card view"><FiGrid className="w-3.5 h-3.5" /></button>
          </div>
          <button onClick={openCreate} className="btn-secondary btn-sm">
            <FiPlus className="w-3.5 h-3.5" /> New Task
          </button>
        </div>
      </div>

      <div className={`${CARD_NO_HOVER} p-4 mb-4`}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            <input className={`${INPUT_CLASSES} pl-9 py-1.5 text-sm`} placeholder="Search tasks..."
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="input py-1.5 text-xs max-w-[130px]" value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">All Status</option>
            {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select className="input py-1.5 text-xs max-w-[120px]" value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}>
            <option value="">All Priority</option>
            {PRIORITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select className="input py-1.5 text-xs max-w-[150px]" value={filterTeam}
            onChange={(e) => { setFilterTeam(e.target.value); setFilterUser(''); }}>
            <option value="">All Teams</option>
            {projectTeams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <select className="input py-1.5 text-xs max-w-[160px]" value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}>
            <option value="">All Users</option>
            {uniqueUsers.map((u) => (
              <option key={u.id || u.user_id} value={u.id || u.user_id}>{u.name || u.email}</option>
            ))}
          </select>
        </div>
      </div>

      {filteredTasks.length === 0 ? (
        <EmptyState
          title={search || filterStatus || filterPriority || filterTeam || filterUser ? 'No matching tasks' : 'No tasks yet'}
          message={search || filterStatus || filterPriority || filterTeam || filterUser ? 'Try different filter criteria' : 'Create your first task to get started.'}
          action={!search && !filterStatus && !filterPriority && !filterTeam && !filterUser
            ? <button onClick={openCreate} className="btn-primary btn-sm"><FiPlus className="w-3.5 h-3.5" /> New Task</button>
            : undefined}
        />
      ) : viewMode === 'table' ? (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Task Name</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Team</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Assignee</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Progress</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredTasks.map((task) => {
                const pStyle = PRIORITY_STYLE[task.priority] || PRIORITY_STYLE.medium;
                const progress = task.progress ?? progressFromStatus(task.status);
                return (
                  <tr key={task.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 truncate max-w-[200px]">{task.title}</p>
                      {task.description && <p className="text-[11px] text-gray-400 truncate max-w-[200px]">{task.description}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${pStyle.bg}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${pStyle.dot}`} />
                        {task.priority || 'medium'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={task.status || 'todo'}
                        onChange={(e) => handleStatusChange(task.id, e.target.value)}
                        className="text-[11px] border border-gray-200 rounded-md px-2 py-1 bg-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {task.team?.name || task.team_name || '-'}
                    </td>
                    <td className="px-4 py-3">
                      {task.assignee?.name || task.assignee_name || task.assigned_to_name ? (
                        <span className="inline-flex items-center gap-1 text-xs text-gray-600">
                          <FiUser className="w-3 h-3 text-gray-400" />
                          {task.assignee?.name || task.assignee_name || task.assigned_to_name}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                        <FiCalendar className="w-3 h-3 text-gray-400" />
                        {task.due_date ? new Date(task.due_date).toLocaleDateString() : '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 max-w-[80px] bg-gray-100 rounded-full h-1.5">
                          <div className={`h-1.5 rounded-full transition-all ${progress >= 100 ? 'bg-emerald-500' : progress >= 70 ? 'bg-blue-500' : progress >= 40 ? 'bg-amber-500' : 'bg-gray-300'}`}
                            style={{ width: `${Math.max(progress, 0)}%` }} />
                        </div>
                        <span className="text-[10px] text-gray-400 w-6 text-right">{progress}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={(e) => { e.stopPropagation(); openView(task); }}
                          className="p-1.5 rounded text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors" title="View">
                          <FiEye className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); openEdit(task); }}
                          className="p-1.5 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Edit">
                          <FiEdit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); openDelete(task); }}
                          className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="Delete">
                          <FiTrash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredTasks.map((task) => {
            const pStyle = PRIORITY_STYLE[task.priority] || PRIORITY_STYLE.medium;
            const progress = task.progress ?? progressFromStatus(task.status);
            return (
              <div key={task.id}
                className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-all cursor-pointer group"
                onClick={() => openView(task)}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-indigo-600 transition-colors">
                    {task.title}
                  </p>
                  <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => openEdit(task)}
                      className="p-1 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Edit">
                      <FiEdit2 className="w-3 h-3" />
                    </button>
                    <button onClick={() => openDelete(task)}
                      className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="Delete">
                      <FiTrash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center flex-wrap gap-1.5 mb-2">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${pStyle.bg}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${pStyle.dot}`} />
                    {task.priority || 'medium'}
                  </span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_STYLE[task.status] || STATUS_STYLE.todo}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${statusColor(task.status)}`} />
                    {STATUS_OPTIONS.find((o) => o.value === (task.status || 'todo'))?.label || 'To Do'}
                  </span>
                </div>
                <div className="space-y-1 mb-2">
                  {task.team?.name || task.team_name ? (
                    <p className="text-[11px] text-gray-500">Team: {task.team?.name || task.team_name}</p>
                  ) : null}
                  <div className="flex items-center gap-1 text-[11px] text-gray-500">
                    <FiUser className="w-3 h-3 text-gray-400" />
                    {task.assignee?.name || task.assignee_name || task.assigned_to_name || 'Unassigned'}
                  </div>
                  {task.due_date && (
                    <div className="flex items-center gap-1 text-[11px] text-gray-500">
                      <FiCalendar className="w-3 h-3 text-gray-400" />
                      Due {new Date(task.due_date).toLocaleDateString()}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                  <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                    <div className={`h-1.5 rounded-full transition-all ${progress >= 100 ? 'bg-emerald-500' : progress >= 70 ? 'bg-blue-500' : progress >= 40 ? 'bg-amber-500' : 'bg-gray-300'}`}
                      style={{ width: `${Math.max(progress, 0)}%` }} />
                  </div>
                  <span className="text-[10px] text-gray-400">{progress}%</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-3 text-xs text-gray-400 text-center">
        Showing {filteredTasks.length} of {tasks.length} task{tasks.length !== 1 ? 's' : ''}
      </div>

      <Modal isOpen={showCreateModal} onClose={() => { setShowCreateModal(false); resetForm(); }} title="Create Task" size="lg">
        <TaskFormFields
          title={formTitle} setTitle={setFormTitle}
          desc={formDesc} setDesc={setFormDesc}
          priority={formPriority} setPriority={setFormPriority}
          status={formStatus} setStatus={setFormStatus}
          teamId={formTeamId} setTeamId={setFormTeamId}
          assigneeId={formAssigneeId} setAssigneeId={setFormAssigneeId}
          dueDate={formDueDate} setDueDate={setFormDueDate}
          projectTeams={projectTeams} teamMembers={teamMembers}
        />
        <div className="flex items-center justify-end gap-3 pt-2 mt-4 border-t border-gray-100">
          <button type="button" onClick={() => { setShowCreateModal(false); resetForm(); }} className="btn-secondary" disabled={saving}>Cancel</button>
          <button type="button" onClick={handleCreate} disabled={!formTitle.trim() || saving} className="btn-primary">
            {saving ? 'Creating...' : 'Create Task'}
          </button>
        </div>
      </Modal>

      <Modal isOpen={showEditModal} onClose={() => { setShowEditModal(false); setSelectedTask(null); resetForm(); }} title="Edit Task" size="lg">
        <TaskFormFields
          title={formTitle} setTitle={setFormTitle}
          desc={formDesc} setDesc={setFormDesc}
          priority={formPriority} setPriority={setFormPriority}
          status={formStatus} setStatus={setFormStatus}
          teamId={formTeamId} setTeamId={setFormTeamId}
          assigneeId={formAssigneeId} setAssigneeId={setFormAssigneeId}
          dueDate={formDueDate} setDueDate={setFormDueDate}
          projectTeams={projectTeams} teamMembers={teamMembers}
        />
        <div className="flex items-center justify-end gap-3 pt-2 mt-4 border-t border-gray-100">
          <button type="button" onClick={() => { setShowEditModal(false); setSelectedTask(null); resetForm(); }} className="btn-secondary" disabled={saving}>Cancel</button>
          <button type="button" onClick={handleEdit} disabled={!formTitle.trim() || saving} className="btn-primary">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </Modal>

      <Modal isOpen={showViewModal} onClose={() => { setShowViewModal(false); setSelectedTask(null); }} title="Task Details" size="lg">
        {selectedTask && <TaskDetailContent task={selectedTask} projectTeams={projectTeams} />}
      </Modal>

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => { setShowDeleteConfirm(false); setSelectedTask(null); }}
        onConfirm={handleDelete}
        title="Delete Task"
        message={`Are you sure you want to delete "${selectedTask?.title}"? This action cannot be undone.`}
        confirmText={deleting ? 'Deleting...' : 'Delete Task'}
        loading={deleting}
        variant="danger"
      />
    </div>
  );
}

function TaskFormFields({ title, setTitle, desc, setDesc, priority, setPriority, status, setStatus, teamId, setTeamId, assigneeId, setAssigneeId, dueDate, setDueDate, projectTeams, teamMembers }) {
  const currentMembers = teamMembers[teamId] || [];
  return (
    <div className="space-y-4">
      <div>
        <label className="label-required">Title</label>
        <input className="input" placeholder="Task title" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div>
        <label className="label">Description</label>
        <textarea className="input min-h-[60px] resize-none" placeholder="Optional description" rows={2}
          value={desc} onChange={(e) => setDesc(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Priority</label>
          <select className="input" value={priority} onChange={(e) => setPriority(e.target.value)}>
            {PRIORITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Status</label>
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="label">Assigned Team</label>
        <select className="input" value={teamId} onChange={(e) => { setTeamId(e.target.value); setAssigneeId(''); }}>
          <option value="">Select team</option>
          {projectTeams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>
      <div>
        <label className="label">Assigned User</label>
        <select className="input" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} disabled={!teamId}>
          <option value="">{teamId ? 'Select user' : 'Select a team first'}</option>
          {currentMembers.map((u) => (
            <option key={u.id || u.user_id} value={u.id || u.user_id}>{u.name || u.email}</option>
          ))}
        </select>
        {teamId && currentMembers.length === 0 && (
          <p className="text-[11px] text-amber-600 mt-1">No members found in this team</p>
        )}
      </div>
      <div>
        <label className="label">Due Date</label>
        <input type="date" className="input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
      </div>
    </div>
  );
}

function TaskDetailContent({ task, projectTeams }) {
  const pStyle = PRIORITY_STYLE[task.priority] || PRIORITY_STYLE.medium;
  const progress = task.progress ?? progressFromStatus(task.status);
  const teamName = task.team?.name || task.team_name || projectTeams.find((t) => t.id === task.team_id)?.name || '-';
  const assigneeName = task.assignee?.name || task.assignee_name || task.assigned_to_name || 'Unassigned';
  const statusLabel = STATUS_OPTIONS.find((o) => o.value === (task.status || 'todo'))?.label || 'To Do';
  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-gray-700 leading-relaxed">{task.description || 'No description provided.'}</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <p className="text-[10px] text-gray-500 mb-1">Priority</p>
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium ${pStyle.bg}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${pStyle.dot}`} />
            {task.priority || 'medium'}
          </span>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <p className="text-[10px] text-gray-500 mb-1">Status</p>
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium`}>
            <span className={`w-1.5 h-1.5 rounded-full ${statusColor(task.status)}`} />
            {statusLabel}
          </span>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <p className="text-[10px] text-gray-500 mb-1">Team</p>
          <p className="text-sm font-semibold text-gray-900 truncate">{teamName}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <p className="text-[10px] text-gray-500 mb-1">Assignee</p>
          <p className="text-sm font-semibold text-gray-900 truncate flex items-center justify-center gap-1">
            <FiUser className="w-3.5 h-3.5 text-gray-400" />{assigneeName}
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <p className="text-[10px] text-gray-500 mb-1">Due Date</p>
          <p className="text-sm font-semibold text-gray-900">
            {task.due_date ? new Date(task.due_date).toLocaleDateString() : '-'}
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <p className="text-[10px] text-gray-500 mb-1">Progress</p>
          <div className="flex items-center gap-2 justify-center">
            <div className="flex-1 max-w-[80px] bg-gray-200 rounded-full h-2">
              <div className={`h-2 rounded-full ${progress >= 100 ? 'bg-emerald-500' : progress >= 70 ? 'bg-blue-500' : progress >= 40 ? 'bg-amber-500' : 'bg-gray-300'}`}
                style={{ width: `${Math.max(progress, 0)}%` }} />
            </div>
            <span className="text-sm font-semibold text-gray-900">{progress}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}


