import { useForm } from 'react-hook-form';
import { FiSend, FiX } from 'react-icons/fi';
import UserSelectDropdown from '../common/UserSelectDropdown';

export default function TaskForm({
  defaultValues = {},
  users = [],
  usersLoading = false,
  onSubmit,
  onCancel,
  loading = false,
}) {
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    defaultValues: {
      title: '',
      description: '',
      priority: 'medium',
      status: 'todo',
      assignee_id: null,
      due_date: '',
      ...defaultValues,
    },
  });

  const assigneeId = watch('assignee_id');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
        <input {...register('title', { required: 'Title is required' })} className="input" placeholder="Enter task title" />
        {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea {...register('description')} rows={3} className="input resize-none" placeholder="Task description..." />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
          <select {...register('priority')} className="input">
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select {...register('status')} className="input">
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="review">Review</option>
            <option value="done">Done</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Assignee</label>
        <UserSelectDropdown
          users={users}
          value={assigneeId}
          onChange={(val) => setValue('assignee_id', val)}
          loading={usersLoading}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
        <input {...register('due_date')} type="date" className="input" />
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn-secondary">
            <FiX className="w-4 h-4" /> Cancel
          </button>
        )}
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? (
            <span className="flex items-center gap-2"><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Saving...</span>
          ) : (
            <><FiSend className="w-4 h-4" /> Save Task</>
          )}
        </button>
      </div>
    </form>
  );
}
