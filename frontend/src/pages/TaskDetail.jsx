import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getTask, getUsers, assignTask } from '../api/tasks';
import { getComments, addComment, deleteAllComments } from '../api/comments';
import { useRolePermissions } from '../hooks/useRolePermissions';
import { STATUS_CONFIG, PRIORITY_CONFIG, CARD_CLASSES, CARD_NO_HOVER, BTN_PRIMARY, BTN_SECONDARY, INPUT_CLASSES, INPUT_ERROR_CLASSES, MODAL_OVERLAY, MODAL_CONTENT, ERROR_ALERT } from '../config/ui';

function Avatar({ name, email, size = 'md' }) {
  const sizeClass = size === 'sm' ? 'w-6 h-6 text-[10px]' : size === 'lg' ? 'w-10 h-10 text-sm' : 'w-8 h-8 text-xs';
  const initials = name ? name.charAt(0).toUpperCase() : email?.charAt(0).toUpperCase() || '?';
  return (
    <div className={`${sizeClass} rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold shrink-0 ring-2 ring-white`}>
      {initials}
    </div>
  );
}

function Comment({ comment }) {
  const isOwnComment = comment.user?.email === (JSON.parse(localStorage.getItem('user')) || {})?.email;

  return (
    <div className={`flex gap-3 ${isOwnComment ? 'flex-row-reverse' : ''}`}>
      <Avatar email={comment.user?.email} name={comment.user?.name} size="sm" />
      <div className={`max-w-[75%] flex flex-col ${isOwnComment ? 'items-end' : 'items-start'}`}>
        <div className={`rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
          comment.is_internal
            ? 'bg-amber-50 border border-amber-200 text-amber-900'
            : isOwnComment
            ? 'bg-indigo-600 text-white'
            : 'bg-gray-100 text-gray-900'
        }`}>
          {comment.content}
        </div>
        <div className="flex items-center gap-2 mt-1.5 px-1">
          <span className="text-xs font-medium text-gray-500">{comment.user?.email || 'Unknown'}</span>
          {comment.is_internal && (
            <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-amber-100 text-amber-700 border border-amber-200">Internal</span>
          )}
          <span className="text-xs text-gray-400">{new Date(comment.created_at).toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}

function AssignModal({ task, users, currentAssigneeId, onClose, onConfirm, assigning }) {
  const [selectedUserId, setSelectedUserId] = useState(currentAssigneeId || '');
  const [error, setError] = useState('');

  const eligibleUsers = users.filter((u) => u.role !== 'admin');

  const handleSubmit = () => {
    if (!selectedUserId) {
      setError('Please select a user to assign this task to.');
      return;
    }
    setError('');
    onConfirm(parseInt(selectedUserId, 10));
  };

  if (!task) return null;

  return (
    <div className={MODAL_OVERLAY}>
      <div className={MODAL_CONTENT}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">Assign Task</h3>
            <p className="text-sm text-gray-500">Choose who will work on this</p>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 mb-4">
          <p className="text-sm font-medium text-gray-900 truncate">"{task.title}"</p>
        </div>

        <div className="mb-5">
          <label htmlFor="assignee" className="block text-sm font-medium text-gray-700 mb-1.5">
            Assign To
          </label>
          <select
            id="assignee"
            value={selectedUserId}
            onChange={(e) => { setSelectedUserId(e.target.value); setError(''); }}
            className={error ? INPUT_ERROR_CLASSES : INPUT_CLASSES}
          >
            <option value="">Select a user...</option>
            {eligibleUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name || u.email} ({u.role})
              </option>
            ))}
          </select>
          {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
          {eligibleUsers.length === 0 && (
            <p className="mt-2 text-xs text-gray-500">No eligible users available. Admins cannot be assigned tasks.</p>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={assigning}
            className={BTN_SECONDARY}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={assigning}
            className={BTN_PRIMARY}
          >
            {assigning ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Assigning...
              </>
            ) : (
              'Assign'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function TaskDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { canManage, canEditTask, canAssignTask } = useRolePermissions();

  const [task, setTask] = useState(null);
  const [comments, setComments] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newComment, setNewComment] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [taskData, commentsData, usersData] = await Promise.all([
          getTask(id),
          getComments(id),
          canManage ? getUsers() : Promise.resolve([]),
        ]);
        setTask(taskData);
        setComments(Array.isArray(commentsData) ? commentsData : []);
        setUsers(Array.isArray(usersData) ? usersData : []);
      } catch (err) {
        console.error('Failed to fetch data:', err);
        setError(err.response?.data?.detail || err.message || 'Failed to load task');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, canManage]);

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      const data = await addComment(id, newComment, isInternal);
      setComments((prev) => [...prev, data]);
      setNewComment('');
      setIsInternal(false);
      toast.success('Comment added');
    } catch (err) {
      toast.error(err.response?.data?.detail || err.message || 'Failed to add comment');
    }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm('Delete all comments? This cannot be undone.')) return;
    setDeletingAll(true);
    setError(null);
    try {
      await deleteAllComments(id);
      setComments([]);
      toast.success('All comments deleted');
    } catch (err) {
      toast.error(err.response?.data?.detail || err.message || 'Failed to delete comments');
    } finally {
      setDeletingAll(false);
    }
  };

  const handleAssign = async (assignedToId) => {
    setAssigning(true);
    setError(null);

    try {
      await assignTask(id, assignedToId);

      const assigneeUser = users.find((u) => u.id === assignedToId);
      setTask((prev) => ({
        ...prev,
        assigned_to_id: assignedToId,
        assignee: assigneeUser || prev.assignee,
      }));

      setShowAssignModal(false);
      toast.success('Task assigned successfully');
    } catch (err) {
      toast.error(err.response?.data?.detail || err.message || 'Failed to assign task');
    } finally {
      setAssigning(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading task...</p>
        </div>
      </div>
    );
  }

  if (error && !task) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className={ERROR_ALERT}>
            <p className="text-sm text-red-700">{error}</p>
          </div>
          <Link to="/tasks" className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Tasks
          </Link>
        </div>
    );
  }

  if (!task) return null;

  const assignee = task.assignee || task.assigned_user || null;
  const creator = task.creator || task.created_by || null;
  const status = STATUS_CONFIG[task.status] || STATUS_CONFIG.todo;
  const priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
  const dueDate = task.due_date ? new Date(task.due_date).toLocaleDateString() : 'Not set';
  const createdAt = new Date(task.created_at).toLocaleString();
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';

  return (
    <>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <Link to="/tasks" className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Tasks
          </Link>
          <div className="flex items-center gap-2">
            {canAssignTask && (
              <button
                onClick={() => setShowAssignModal(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Assign
              </button>
            )}
            {canEditTask && (
              <button
                onClick={() => navigate(`/tasks/${id}/edit`)}
                className={BTN_PRIMARY}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit Task
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className={ERROR_ALERT}>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className={CARD_NO_HOVER}>
              <div className="p-6">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <h1 className="text-xl font-bold text-gray-900 flex-1 leading-tight">{task.title}</h1>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${status.badge} shrink-0`}>
                    {status.label}
                  </span>
                </div>

                {task.description && (
                  <div className="mb-6">
                    <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{task.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-gray-100">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Priority</p>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border ${priority.badge}`}>
                      <span className={`w-2 h-2 rounded-full ${priority.dot}`} />
                      {priority.label}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Due Date</p>
                    <p className={`text-sm font-medium ${isOverdue ? 'text-red-600' : 'text-gray-900'}`}>{dueDate}</p>
                  </div>
                  <div className="hidden sm:block">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Created</p>
                    <p className="text-sm text-gray-700">{createdAt}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className={CARD_NO_HOVER}>
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-base font-semibold text-gray-900">Comments <span className="text-gray-400 font-normal">({comments.length})</span></h2>
                {canManage && comments.length > 0 && (
                  <button
                    onClick={handleDeleteAll}
                    disabled={deletingAll}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deletingAll ? (
                      <>
                        <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Deleting...
                      </>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete all
                      </>
                    )}
                  </button>
                )}
              </div>

              <div className="p-6 space-y-6">
                {comments.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-gray-900">No comments yet</p>
                    <p className="text-xs text-gray-500 mt-1">Start the conversation below</p>
                  </div>
                ) : (
                  comments.map((comment) => (
                    <Comment key={comment.id} comment={comment} />
                  ))
                )}

                <form onSubmit={handleSubmitComment} className="border-t border-gray-200 pt-5">
                  <div className="space-y-3">
                    {canManage && (
                      <div className="flex items-center gap-2">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isInternal}
                            onChange={(e) => setIsInternal(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                        </label>
                        <span className="text-sm font-medium text-gray-700">Internal comment</span>
                      </div>
                    )}

                    <div className="flex gap-2 sm:gap-3">
                      <input
                        type="text"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Type your comment..."
                        className="flex-1 min-w-0 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent hover:border-gray-400 transition-colors"
                        required
                      />
                      <button type="submit" className={BTN_PRIMARY}>
                        Send
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className={CARD_NO_HOVER}>
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900">Details</h3>
              </div>

              <div className="p-6 space-y-5">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Assigned To</p>
                  <div className="flex items-center gap-2.5">
                    <Avatar name={assignee?.name} email={assignee?.email} />
                    <span className="text-sm text-gray-900 font-medium">{assignee?.email || `User #${task.assigned_to_id}`}</span>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Created By</p>
                  <div className="flex items-center gap-2.5">
                    <Avatar name={creator?.name} email={creator?.email} />
                    <span className="text-sm text-gray-900 font-medium">{creator?.email || `User #${task.created_by_id}`}</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Created At</p>
                  <p className="text-sm text-gray-700">{createdAt}</p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Updated At</p>
                  <p className="text-sm text-gray-700">{task.updated_at ? new Date(task.updated_at).toLocaleString() : '—'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {canAssignTask && showAssignModal && (
        <AssignModal
          task={task}
          users={users}
          currentAssigneeId={task.assigned_to_id}
          onClose={() => setShowAssignModal(false)}
          onConfirm={handleAssign}
          assigning={assigning}
        />
      )}
    </>
  );
}

export default TaskDetail;
