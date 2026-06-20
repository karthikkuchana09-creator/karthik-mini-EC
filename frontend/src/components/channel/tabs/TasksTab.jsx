import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import * as channelsApi from '../../../api/channels';
import * as channelTasksApi from '../../../api/channelTasks';
import { getErrorMessage } from '../../../utils/errorHandler';
import Modal from '../../ui/Modal';

const STATUS_STYLES = {
  todo: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-blue-50 text-blue-700',
  review: 'bg-amber-50 text-amber-700',
  done: 'bg-emerald-50 text-emerald-700',
};

export default function TasksTab({ channelId }) {
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const createForm = useForm({ defaultValues: { title: '', description: '', priority: 'medium', due_date: '', assigned_to_id: '' } });

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const [data, ms] = await Promise.all([
        channelTasksApi.getChannelTasks(channelId),
        channelsApi.getChannelMembers(channelId),
      ]);
      setTasks(Array.isArray(data) ? data : data?.items || data?.tasks || []);
      setMembers(Array.isArray(ms) ? ms : ms?.members || ms?.data || []);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load tasks'));
    } finally {
      setLoading(false);
    }
  }, [channelId]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleStatusChange = async (taskId, newStatus) => {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));
    try {
      await channelTasksApi.updateChannelTaskStatus(channelId, taskId, newStatus);
    } catch (err) {
      fetchTasks();
      toast.error(getErrorMessage(err, 'Failed to update status'));
    }
  };

  const handleCreateTask = async (formData) => {
    try {
      const payload = { ...formData };
      if (payload.assigned_to_id === '') payload.assigned_to_id = null;
      if (payload.due_date === '') payload.due_date = null;
      const created = await channelTasksApi.createChannelTask(channelId, payload);
      setTasks((prev) => [...prev, created]);
      setShowCreateModal(false);
      createForm.reset();
      toast.success('Task created');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to create task'));
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Tasks</h2>
        <button onClick={() => setShowCreateModal(true)} className="btn-primary text-xs">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Task
        </button>
      </div>

      {tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-700">No tasks yet</p>
          <p className="text-xs text-gray-400 mt-1">Create a task to get started</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <Link
              key={task.id}
              to={`/channel-list/${channelId}/tasks/${task.id}`}
              className="flex items-center gap-4 p-3.5 rounded-xl hover:bg-gray-50 transition-colors group border border-gray-100/50 hover:border-gray-200"
            >
          <button
            onClick={(e) => {
              e.preventDefault();
              handleStatusChange(task.id, task.status === 'done' ? 'todo' : 'done');
            }}
            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
              task.status === 'done'
                ? 'bg-emerald-500 border-emerald-500 text-white'
                : 'border-gray-300 hover:border-emerald-400'
            }`}
          >
            {task.status === 'done' && (
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            )}
          </button>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium truncate ${task.status === 'done' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
              {task.title}
            </p>
            {task.assigned_to_name && (
              <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1.5">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
                {task.assigned_to_name}
              </p>
            )}
          </div>
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium shrink-0 ${STATUS_STYLES[task.status] || 'bg-gray-100 text-gray-700'}`}>
            {task.status?.replace('_', ' ') || 'todo'}
          </span>
        </Link>
          ))}
        </div>
      )}

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
                <option key={m.user_id} value={m.user_id}>{m.name || m.user_name || m.email || `Member #${m.user_id}`}</option>
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
    </div>
  );
}
