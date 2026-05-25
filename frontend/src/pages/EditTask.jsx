import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import { getTask, updateTask } from '../api/tasks';
import { useRolePermissions } from '../hooks/useRolePermissions';
import { useUsers } from '../services/useUsersQuery';

const statusConfig = {
  todo: { label: 'To Do', disabled: false },
  in_progress: { label: 'In Progress', disabled: false },
  review: { label: 'Review', disabled: false },
  done: { label: 'Done', disabled: false },
};

function EditTask() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { canEditTask, isEmployee } = useRolePermissions();

  const { data: users = [], isLoading: usersLoading, error: usersError, refetch: refetchUsers } = useUsers();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium',
    due_date: '',
    assigned_to_id: '',
  });

  const [errors, setErrors] = useState({});

  const canEditAssignee = canEditTask;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const taskData = await getTask(id);

        const dueDate = taskData.due_date
          ? new Date(taskData.due_date).toISOString().split('T')[0]
          : '';

        setForm({
          title: taskData.title || '',
          description: taskData.description || '',
          status: taskData.status || 'todo',
          priority: taskData.priority || 'medium',
          due_date: dueDate,
          assigned_to_id: taskData.assigned_to_id?.toString() || '',
        });
      } catch (err) {
        console.error('Failed to fetch data:', err);
        setError(err.response?.data?.detail || err.message || 'Failed to load task');
      } finally {
        setFetching(false);
      }
    };

    fetchData();
  }, [id, navigate]);

  const validate = () => {
    const newErrors = {};

    if (canEditTask && !form.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (canEditAssignee && !form.assigned_to_id) {
      newErrors.assigned_to_id = 'Please assign this task to a user';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setError(null);

    try {
      const taskData = {};

      if (isEmployee) {
        taskData.status = form.status;
      } else {
        taskData.title = form.title.trim();
        taskData.description = form.description.trim() || null;
        taskData.status = form.status;
        taskData.priority = form.priority;
        taskData.due_date = form.due_date || null;
        taskData.assigned_to_id = parseInt(form.assigned_to_id, 10);
      }

      await updateTask(id, taskData);
      navigate(`/tasks/${id}`);
    } catch (err) {
      setError(err.response?.data?.detail || err.response?.data?.message || err.message || 'Failed to update task');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  if (fetching) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading task...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => navigate(`/tasks/${id}`)}
          className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Task
        </button>

        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Edit Task</h1>
          <p className="text-sm text-gray-500 mt-1">
            {isEmployee ? 'You can only update the status' : 'Update task details'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6">
          {canEditTask && (
            <>
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  id="title"
                  type="text"
                  value={form.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${
                    errors.title ? 'border-red-300 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                  }`}
                  placeholder="Enter task title"
                />
                {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title}</p>}
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Description
                </label>
                <textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  rows="4"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent hover:border-gray-400 transition-colors resize-none"
                  placeholder="Describe the task details..."
                />
              </div>
            </>
          )}

          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1.5">
              Status <span className="text-red-500">*</span>
            </label>
            <select
              id="status"
              value={form.status}
              onChange={(e) => handleChange('status', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent hover:border-gray-400 transition-colors bg-white"
            >
              {Object.entries(statusConfig).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.label}
                </option>
              ))}
            </select>
          </div>

          {canEditTask && (
            <>
              <div>
                <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Priority
                </label>
                <select
                  id="priority"
                  value={form.priority}
                  onChange={(e) => handleChange('priority', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent hover:border-gray-400 transition-colors bg-white"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              <div>
                <label htmlFor="due_date" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Due Date
                </label>
                <input
                  id="due_date"
                  type="date"
                  value={form.due_date}
                  onChange={(e) => handleChange('due_date', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent hover:border-gray-400 transition-colors"
                />
              </div>

              {canEditAssignee && (
                <div>
                  <label htmlFor="assigned_to_id" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Assign To <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="assigned_to_id"
                    value={form.assigned_to_id}
                    onChange={(e) => handleChange('assigned_to_id', e.target.value)}
                    className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors bg-white ${
                      errors.assigned_to_id ? 'border-red-300 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <option value="">Select a user...</option>
                    {usersLoading ? (
                      <option disabled>Loading users...</option>
                    ) : !users.length && usersError ? (
                      <option disabled>Failed to load users</option>
                    ) : !users.length ? (
                      <option disabled>No users available</option>
                    ) : (
                      users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name || u.email} ({u.role})
                        </option>
                      ))
                    )}
                  </select>
                  {!usersLoading && !users.length && usersError && (
                    <div className="mt-2">
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-red-500">Could not load users.</p>
                        <button
                          type="button"
                          onClick={() => refetchUsers()}
                          className="text-xs text-indigo-600 hover:text-indigo-700 underline"
                        >
                          Retry
                        </button>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {usersError?.response?.data?.detail || usersError?.response?.data?.message || usersError?.message}
                      </p>
                    </div>
                  )}
                  {errors.assigned_to_id && <p className="mt-1 text-xs text-red-600">{errors.assigned_to_id}</p>}
                </div>
              )}
            </>
          )}

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => navigate(`/tasks/${id}`)}
              className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
  );
}

export default EditTask;
