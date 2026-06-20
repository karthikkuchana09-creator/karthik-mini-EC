import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import * as workspaceApi from '../../api/workspaces';
import * as workspaceTasksApi from '../../api/workspaceTasks';
import { getErrorMessage } from '../../utils/errorHandler';
import { formatTimestamp } from '../../utils/format';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/ui/Modal';
import Breadcrumb from '../../components/ui/Breadcrumb';

const PRIORITY_STYLES = {
  low: 'bg-slate-100 text-slate-700',
  medium: 'bg-amber-50 text-amber-700',
  high: 'bg-red-50 text-red-700',
  critical: 'bg-rose-50 text-rose-700',
};

const STATUS_STYLES = {
  todo: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-blue-50 text-blue-700',
  review: 'bg-purple-50 text-purple-700',
  done: 'bg-emerald-50 text-emerald-700',
};

const STATUS_TABS = [
  { key: 'all', label: 'All' },
  { key: 'todo', label: 'To Do' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'review', label: 'Review' },
  { key: 'done', label: 'Done' },
];

export default function WorkspaceTasks() {
  const { id } = useParams();
  const navigate = useNavigate();
  const workspaceId = Number(id);

  const [workspace, setWorkspace] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  const createForm = useForm({ defaultValues: { title: '', description: '', priority: 'medium', due_date: '', assigned_to_id: '' } });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [ws, ts, ms] = await Promise.all([
        workspaceApi.getWorkspace(workspaceId),
        workspaceTasksApi.getWorkspaceTasks(workspaceId),
        workspaceApi.getWorkspaceMembers(workspaceId),
      ]);
      setWorkspace(ws);
      setTasks(Array.isArray(ts) ? ts : ts?.items || ts?.tasks || []);
      setMembers(Array.isArray(ms) ? ms : ms?.members || ms?.data || []);
    } catch (err) {
      if (err?.response?.status === 404) {
        toast.error('Workspace not found');
        navigate('/workspace-list');
      } else {
        setError(getErrorMessage(err, 'Failed to load data'));
        toast.error(getErrorMessage(err, 'Failed to load data'));
      }
    } finally {
      setLoading(false);
    }
  }, [workspaceId, navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredTasks = tasks.filter((t) => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    return true;
  });

  const handleCreateTask = async (formData) => {
    try {
      const payload = { ...formData };
      if (payload.assigned_to_id === '') payload.assigned_to_id = null;
      if (payload.due_date === '') payload.due_date = null;
      const created = await workspaceTasksApi.createWorkspaceTask(workspaceId, payload);
      setTasks((prev) => [...prev, created]);
      setShowCreateModal(false);
      createForm.reset();
      toast.success('Task created');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to create task'));
    }
  };

  const handleAssign = async (taskId, assignedToId) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, assigned_to_id: assignedToId, assigned_to_name: members.find((m) => m.id === assignedToId)?.name || null }
          : t,
      ),
    );
    setShowAssignModal(false);
    setSelectedTask(null);
    try {
      await workspaceTasksApi.assignWorkspaceTask(workspaceId, taskId, assignedToId);
      toast.success('Task assigned');
    } catch (err) {
      fetchData();
      toast.error(getErrorMessage(err, 'Failed to assign task'));
    }
  };

  const columns = [
    {
      Header: 'Title',
      accessor: 'title',
      Cell: ({ value, row }) => (
        <button
          onClick={() => { setSelectedTask(row.original); setShowViewModal(true); }}
          className="text-sm font-medium text-gray-900 hover:text-indigo-600 transition-colors text-left truncate max-w-[280px]"
        >
          {value || 'Untitled'}
        </button>
      ),
    },
    {
      Header: 'Status',
      accessor: 'status',
      Cell: ({ value }) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium ${STATUS_STYLES[value] || 'bg-gray-100 text-gray-700'}`}>
          {value?.replace('_', ' ') || 'todo'}
        </span>
      ),
    },
    {
      Header: 'Priority',
      accessor: 'priority',
      Cell: ({ value }) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium capitalize ${PRIORITY_STYLES[value] || 'bg-slate-100 text-slate-700'}`}>
          {value || 'medium'}
        </span>
      ),
    },
    {
      Header: 'Assignee',
      accessor: 'assigned_to_name',
      Cell: ({ value, row }) => (
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-semibold text-indigo-600 shrink-0">
            {value?.[0]?.toUpperCase() || '?'}
          </div>
          <span className="text-sm text-gray-700 truncate max-w-[120px]">{value || 'Unassigned'}</span>
        </div>
      ),
    },
    {
      Header: 'Due Date',
      accessor: 'due_date',
      Cell: ({ value }) => (
        <span className="text-sm text-gray-600 tabular-nums">{value ? formatTimestamp(value) : '-'}</span>
      ),
    },
    {
      Header: '',
      accessor: 'actions',
      disableSortBy: true,
      Cell: ({ row }) => (
        <button
          onClick={(e) => { e.stopPropagation(); setSelectedTask(row.original); setShowAssignModal(true); }}
          className="text-xs font-medium text-indigo-600 hover:text-indigo-800 px-2 py-1 rounded-md hover:bg-indigo-50 transition-colors"
        >
          {row.original.assigned_to_id ? 'Reassign' : 'Assign'}
        </button>
      ),
    },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <Breadcrumb
        className="mb-6"
        items={[
          { label: 'Workspaces', to: '/workspace-list' },
          { label: workspace?.name || 'Workspace', to: `/workspace-list/${workspaceId}` },
          { label: 'Tasks' },
        ]}
      />

      <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <h1 className="text-xl font-bold text-gray-900">Tasks</h1>
            <button onClick={() => setShowCreateModal(true)} className="btn-primary text-xs">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              New Task
            </button>
          </div>
          <div className="flex items-center bg-gray-100 rounded-lg p-0.5 w-fit">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  statusFilter === tab.key
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
                <span className="ml-1.5 text-gray-400">
                  ({tab.key === 'all' ? tasks.length : tasks.filter((t) => t.status === tab.key).length})
                </span>
              </button>
            ))}
          </div>
        </div>

        {error && !loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="p-3 rounded-full bg-red-50 mb-4">
              <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-900 mb-1">Failed to load</p>
            <p className="text-xs text-gray-500 mb-4">{error}</p>
            <button onClick={fetchData} className="btn-secondary text-sm">Try Again</button>
          </div>
        ) : (
        <div className="p-6">
          <DataTable
            columns={columns}
            data={filteredTasks}
            loading={loading}
            sortable
            searchable
            paginated
            pageSize={15}
            pageSizeOptions={[10, 15, 25, 50]}
            showPageSize
            emptyTitle="No tasks yet"
            emptyMessage="Create a task to get started with this workspace."
            rowKey="id"
          />
        </div>
      )}
      </div>

      <Modal isOpen={showCreateModal} onClose={() => { setShowCreateModal(false); createForm.reset(); }} title="Create Task" size="lg">
        <form onSubmit={createForm.handleSubmit(handleCreateTask)} className="space-y-4">
          <div>
            <label className="label">Title</label>
            <input className="input" {...createForm.register('title', { required: 'Title is required' })} placeholder="Enter task title" />
            {createForm.formState.errors.title && <p className="text-xs text-red-500 mt-1">{createForm.formState.errors.title.message}</p>}
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input min-h-[80px] resize-none" {...createForm.register('description')} placeholder="Optional description" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Priority</label>
              <select className="input" {...createForm.register('priority')}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div>
              <label className="label">Due Date</label>
              <input type="date" className="input" {...createForm.register('due_date')} />
            </div>
          </div>
          <div>
            <label className="label">Assign To</label>
            <select className="input" {...createForm.register('assigned_to_id')}>
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.name || m.user_name || m.email || `Member #${m.id}`}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => { setShowCreateModal(false); createForm.reset(); }} className="btn-secondary text-sm">Cancel</button>
            <button type="submit" className="btn-primary text-sm" disabled={createForm.formState.isSubmitting}>
              {createForm.formState.isSubmitting ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={showViewModal} onClose={() => { setShowViewModal(false); setSelectedTask(null); }} title={selectedTask?.title || 'Task Details'} size="lg">
        {selectedTask && (
          <div className="space-y-5">
            <div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{selectedTask.description || 'No description provided.'}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Status</h4>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[selectedTask.status] || 'bg-gray-100 text-gray-700'}`}>
                  {selectedTask.status?.replace('_', ' ') || 'todo'}
                </span>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Priority</h4>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${PRIORITY_STYLES[selectedTask.priority] || 'bg-slate-100 text-slate-700'}`}>
                  {selectedTask.priority || 'medium'}
                </span>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Assignee</h4>
                <p className="text-sm text-gray-900">{selectedTask.assigned_to_name || 'Unassigned'}</p>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Due Date</h4>
                <p className="text-sm text-gray-900">{selectedTask.due_date ? formatTimestamp(selectedTask.due_date) : 'Not set'}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Created</h4>
                <p className="text-sm text-gray-900 tabular-nums">{formatTimestamp(selectedTask.created_at)}</p>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Updated</h4>
                <p className="text-sm text-gray-900 tabular-nums">{formatTimestamp(selectedTask.updated_at)}</p>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => { setShowViewModal(false); setSelectedTask(selectedTask); setShowAssignModal(true); }}
                className="btn-secondary text-sm"
              >
                {selectedTask.assigned_to_id ? 'Reassign' : 'Assign'}
              </button>
              <button onClick={() => setShowViewModal(false)} className="btn-primary text-sm">Close</button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={showAssignModal} onClose={() => { setShowAssignModal(false); setSelectedTask(null); }} title={selectedTask?.assigned_to_id ? 'Reassign Task' : 'Assign Task'} size="md">
        {selectedTask && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              const assignedToId = Number(formData.get('assigned_to_id'));
              handleAssign(selectedTask.id, assignedToId);
            }}
            className="space-y-4"
          >
            <div>
              <label className="label">Task</label>
              <p className="text-sm text-gray-900 font-medium">{selectedTask.title}</p>
            </div>
            <div>
              <label className="label">Current Assignee</label>
              <p className="text-sm text-gray-700">{selectedTask.assigned_to_name || 'Unassigned'}</p>
            </div>
            <div>
              <label className="label">Assign To</label>
              <select name="assigned_to_id" className="input" defaultValue={selectedTask.assigned_to_id || ''} required>
                <option value="" disabled>Select a member</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>{m.name || m.user_name || m.email || `Member #${m.id}`}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => { setShowAssignModal(false); setSelectedTask(null); }} className="btn-secondary text-sm">Cancel</button>
              <button type="submit" className="btn-primary text-sm">Assign</button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
