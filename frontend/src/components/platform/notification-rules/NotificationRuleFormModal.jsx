import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { FiMessageSquare, FiX } from 'react-icons/fi';
import Modal from '../../ui/Modal';

const EVENT_TYPES = [
  { value: 'task_assignment', label: 'Task Assigned' },
  { value: 'task_status', label: 'Task Status Change' },
  { value: 'approval_request', label: 'Approval Pending' },
  { value: 'approval_action', label: 'Approval Action' },
  { value: 'meeting_reminder', label: 'Meeting Reminder' },
  { value: 'escalation_alert', label: 'Escalation Alert' },
  { value: 'mention_alert', label: 'Mention' },
  { value: 'document_update', label: 'Document Update' },
  { value: 'comment', label: 'Comment' },
  { value: 'system_alert', label: 'System Alert' },
  { value: 'sla_breach', label: 'SLA Breach' },
];

const CHANNELS = [
  { value: 'in_app', label: 'In-App Notification' },
  { value: 'email', label: 'Email' },
  { value: 'both', label: 'Both In-App & Email' },
];

export default function NotificationRuleFormModal({ isOpen, onClose, onSubmit, rule }) {
  const isEditing = !!rule;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
    watch,
  } = useForm({
    defaultValues: {
      name: '',
      description: '',
      event_type: 'task_assignment',
      channel: 'in_app',
      is_active: true,
    },
  });

  useEffect(() => {
    if (rule) {
      reset({
        name: rule.name || '',
        description: rule.description || '',
        event_type: rule.event_type || 'task_assignment',
        channel: rule.channel || 'in_app',
        is_active: rule.is_active ?? true,
      });
    } else {
      reset({
        name: '',
        description: '',
        event_type: 'task_assignment',
        channel: 'in_app',
        is_active: true,
      });
    }
  }, [rule, isOpen, reset]);

  const onFormSubmit = async (data) => {
    await onSubmit(rule?.id, {
      name: data.name.trim(),
      description: data.description.trim() || null,
      event_type: data.event_type,
      channel: data.channel,
      is_active: data.is_active,
    });
    onClose();
  };

  const handleClose = () => { reset(); onClose(); };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="lg">
      <form onSubmit={handleSubmit(onFormSubmit)}>
        <div className="flex items-center gap-3 mb-6">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-sm ${isEditing ? 'from-amber-500 to-orange-500' : 'from-indigo-500 to-violet-500'}`}>
            <FiMessageSquare className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{isEditing ? 'Edit Rule' : 'Create Rule'}</h3>
            <p className="text-sm text-gray-500">{isEditing ? 'Update notification rule configuration' : 'Define a new notification rule'}</p>
          </div>
          <button type="button" onClick={handleClose} className="ml-auto p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rule Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className={`input ${errors.name ? 'input-error' : ''}`}
              placeholder="e.g., Notify manager on task assignment"
              {...register('name', { required: 'Rule name is required' })}
            />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              rows={2}
              className="input resize-none"
              placeholder="Describe when this rule should trigger..."
              {...register('description')}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Event Type <span className="text-red-500">*</span>
              </label>
              <select
                className={`input ${errors.event_type ? 'input-error' : ''}`}
                {...register('event_type', { required: 'Event type is required' })}
              >
                {EVENT_TYPES.map((evt) => (
                  <option key={evt.value} value={evt.value}>{evt.label}</option>
                ))}
              </select>
              {errors.event_type && <p className="mt-1 text-xs text-red-600">{errors.event_type.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notification Type <span className="text-red-500">*</span>
              </label>
              <select
                className={`input ${errors.channel ? 'input-error' : ''}`}
                {...register('channel', { required: 'Notification type is required' })}
              >
                {CHANNELS.map((ch) => (
                  <option key={ch.value} value={ch.value}>{ch.label}</option>
                ))}
              </select>
              {errors.channel && <p className="mt-1 text-xs text-red-600">{errors.channel.message}</p>}
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                {...register('is_active')}
              />
              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500/30 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
            <span className="text-sm text-gray-700 font-medium">Active</span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 mt-8 pt-5 border-t border-gray-100">
          <button type="button" onClick={handleClose} className="btn-secondary" disabled={isSubmitting}>
            Cancel
          </button>
          <button type="submit" disabled={isSubmitting} className="btn-primary">
            {isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Rule'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
