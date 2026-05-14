import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getTasks, deleteTask } from '../api/tasks';
import { useRolePermissions } from '../hooks/useRolePermissions';
import { STATUS_CONFIG, PRIORITY_CONFIG, CARD_CLASSES, BTN_PRIMARY, BTN_DANGER, BTN_SECONDARY, MODAL_OVERLAY, MODAL_CONTENT, ERROR_ALERT, EMPTY_STATE, INPUT_CLASSES } from '../config/ui';

function Avatar({ name, email }) {
  const initials = name ? name.charAt(0).toUpperCase() : email?.charAt(0).toUpperCase() || '?';
  return (
    <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-xs font-semibold shrink-0 ring-2 ring-white">
      {initials}
    </div>
  );
}

function TaskCard({ task, onConfirmDelete }) {
  const { canEditTask, canDeleteTask } = useRolePermissions();

  const status = STATUS_CONFIG[task.status] || STATUS_CONFIG.todo;
  const priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.low;

  const assignee = task.assignee || task.assigned_user || null;
  const dueDate = task.due_date ? new Date(task.due_date).toLocaleDateString() : null;
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';

  return (
    <div className={`${CARD_CLASSES} p-5 flex flex-col`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2 flex-1">
          {task.title}
        </h3>
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${status.badge} shrink-0`}>
          {status.label}
        </span>
      </div>

      <p className="text-xs text-gray-500 mb-4 line-clamp-2 leading-relaxed">{task.description}</p>

      <div className="flex flex-wrap items-center gap-2 mb-4 mt-auto">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border ${priority.badge}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${priority.dot}`} />
          {priority.label}
        </span>
        {dueDate && (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${isOverdue ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-violet-50 text-violet-700 border border-violet-200'}`}>
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {dueDate}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div className="flex items-center gap-2 min-w-0">
          <Avatar name={assignee?.name} email={assignee?.email} />
          <span className="text-xs text-gray-500 truncate">{assignee?.email || `User #${task.assigned_to_id}`}</span>
        </div>

        <div className="flex items-center gap-3 shrink-0 ml-2">
          <Link
            to={`/tasks/${task.id}`}
            className="text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            View
          </Link>
          {canEditTask && (
            <Link
              to={`/tasks/${task.id}/edit`}
              className="text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
            >
              Edit
            </Link>
          )}
          {canDeleteTask && (
            <button
              onClick={() => onConfirmDelete(task)}
              className="text-xs font-medium text-red-500 hover:text-red-700 transition-colors"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function DeleteModal({ task, onClose, onConfirm, deleting }) {
  if (!task) return null;

  return (
    <div className={MODAL_OVERLAY}>
      <div className={`${MODAL_CONTENT} max-w-sm`}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">Delete Task</h3>
            <p className="text-sm text-gray-500">This action cannot be undone</p>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 mb-6">
          <p className="text-sm font-medium text-gray-900 truncate">"{task.title}"</p>
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={deleting}
            className={BTN_SECONDARY}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className={BTN_DANGER}
          >
            {deleting ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Deleting...
              </>
            ) : (
              'Delete Task'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function TaskList() {
  const { canCreateTask, role } = useRolePermissions();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const data = await getTasks();
        setTasks(Array.isArray(data) ? data : (data?.items || []));
      } catch (err) {
        console.error('Task fetch error:', err);
        setError(err.response?.data?.detail || err.response?.data?.message || err.message || 'Failed to load tasks');
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, []);

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    setError(null);

    try {
      await deleteTask(deleteTarget.id);
      setTasks((prev) => prev.filter((t) => t.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      setError(err.response?.data?.detail || err.response?.data?.message || 'Failed to delete task');
    } finally {
      setDeleting(false);
    }
  };

  const filteredTasks = filter === 'all'
    ? tasks
    : tasks.filter((t) => t.status === filter);

  const roleLabel = {
    admin: 'All tasks in the system',
    manager: 'Tasks you created or are assigned to',
    employee: 'Tasks assigned to you',
  };

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Tasks</h1>
            <p className="text-sm text-gray-500 mt-1">{roleLabel[role] || 'Tasks'}</p>
          </div>
          {canCreateTask && (
            <Link to="/tasks/create" className={BTN_PRIMARY}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Create Task
            </Link>
          )}
        </div>

        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
          {[
            { key: 'all', label: 'All' },
            { key: 'todo', label: 'To Do' },
            { key: 'in_progress', label: 'In Progress' },
            { key: 'review', label: 'Review' },
            { key: 'done', label: 'Done' },
          ].map((f) => {
            const status = STATUS_CONFIG[f.key];
            const isActive = filter === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all border ${
                  isActive
                    ? 'bg-gray-900 text-white border-gray-900 shadow-sm'
                    : `bg-white text-gray-600 border-gray-200 hover:bg-gray-50 ${status?.dot ? 'hover:border-gray-300' : ''}`
                }`}
              >
                {f.key !== 'all' && status && (
                  <span className={`w-2 h-2 rounded-full ${status.dot}`} />
                )}
                {f.label}
                {f.key !== 'all' && (
                  <span className={`text-xs ${isActive ? 'text-gray-300' : 'text-gray-400'}`}>
                    {tasks.filter((t) => t.status === f.key).length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {error && (
          <div className={ERROR_ALERT}>
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-500">Loading tasks...</p>
            </div>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className={EMPTY_STATE}>
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-gray-900 font-semibold">No tasks found</p>
            <p className="text-sm text-gray-500 mt-1">Tasks will appear here once created.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredTasks.map((task) => (
              <TaskCard key={task.id} task={task} onConfirmDelete={setDeleteTarget} />
            ))}
          </div>
        )}
      </div>

      <DeleteModal
        task={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        deleting={deleting}
      />
    </>
  );
}

export default TaskList;
