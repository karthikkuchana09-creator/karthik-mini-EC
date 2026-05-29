import toast from 'react-hot-toast';

const DURATIONS = {
  success: 3000,
  error: 5000,
  loading: Infinity,
};

function icon(emoji) {
  return emoji;
}

export const toastMessages = {
  success: {
    default(message) {
      return toast.success(message, { duration: DURATIONS.success });
    },

    created(resource) {
      return toast.success(`${resource} created successfully`, { duration: DURATIONS.success });
    },

    updated(resource) {
      return toast.success(`${resource} updated successfully`, { duration: DURATIONS.success });
    },

    deleted(resource) {
      return toast.success(`${resource} deleted successfully`, { duration: DURATIONS.success });
    },

    slaRuleCreated() {
      return toast.success('SLA rule created successfully', { duration: DURATIONS.success });
    },

    slaRuleUpdated() {
      return toast.success('SLA rule updated successfully', { duration: DURATIONS.success });
    },

    slaRuleDeleted() {
      return toast.success('SLA rule deleted successfully', { duration: DURATIONS.success });
    },

    slaRuleToggled(active) {
      return toast.success(`SLA rule ${active ? 'enabled' : 'disabled'}`, { duration: DURATIONS.success });
    },

    slaCompleted(module) {
      return toast.success(`SLA target met for ${module}`, {
        duration: 4000,
        icon: icon('✓'),
      });
    },

    escalationCreated() {
      return toast.success('Escalation created successfully', { duration: DURATIONS.success });
    },

    escalationResolved(id) {
      return toast.success(`Escalation #${id} resolved`, {
        duration: 4000,
        icon: icon('✓'),
      });
    },

    escalationCancelled(id) {
      return toast.success(`Escalation #${id} cancelled`, { duration: DURATIONS.success });
    },

    delegationCreated() {
      return toast.success('Delegation created successfully', { duration: DURATIONS.success });
    },

    delegationCancelled() {
      return toast.success('Delegation cancelled successfully', { duration: DURATIONS.success });
    },

    taskCreated() {
      return toast.success('Task created successfully', { duration: DURATIONS.success });
    },

    taskUpdated() {
      return toast.success('Task updated successfully', { duration: DURATIONS.success });
    },

    taskDeleted() {
      return toast.success('Task deleted successfully', { duration: DURATIONS.success });
    },

    taskStatusUpdated(status) {
      return toast.success(`Task status updated to ${status}`, { duration: DURATIONS.success });
    },

    taskAssigned() {
      return toast.success('Task assigned successfully', { duration: DURATIONS.success });
    },

    approvalUpdated(action) {
      return toast.success(`Approval ${action} successfully`, { duration: DURATIONS.success });
    },

    notificationRead() {
      return toast.success('Notification marked as read', { duration: DURATIONS.success });
    },

    notificationAllRead() {
      return toast.success('All notifications marked as read', { duration: DURATIONS.success });
    },

    preferencesSaved() {
      return toast.success('Notification preferences saved', { duration: DURATIONS.success });
    },

    saved() {
      return toast.success('Changes saved successfully', { duration: DURATIONS.success });
    },
  },

  error: {
    default(message) {
      return toast.error(message, { duration: DURATIONS.error });
    },

    apiError(err) {
      const msg = err?.response?.data?.detail || err?.message || 'An unexpected error occurred';
      return toast.error(msg, { duration: DURATIONS.error });
    },

    validation(err) {
      const data = err?.response?.data;
      if (data?.detail) {
        return toast.error(data.detail, { duration: DURATIONS.error });
      }
      if (data && typeof data === 'object') {
        const firstError = Object.values(data).flat().filter(Boolean)[0];
        return toast.error(firstError || 'Validation failed', { duration: DURATIONS.error });
      }
      return toast.error('Validation failed. Please check your input.', { duration: DURATIONS.error });
    },

    unauthorized(message) {
      return toast.error(message || 'Session expired. Please login again.', {
        duration: 5000,
        icon: icon('!'),
      });
    },

    forbidden() {
      return toast.error('You do not have permission to perform this action', { duration: DURATIONS.error });
    },

    notFound(resource) {
      return toast.error(`${resource || 'Resource'} not found`, { duration: DURATIONS.error });
    },

    network() {
      return toast.error('Network error. Please check your connection.', { duration: DURATIONS.error });
    },

    timeout() {
      return toast.error('Request timed out. Please try again.', { duration: DURATIONS.error });
    },

    delegationConflict(user) {
      return toast.error(
        user
          ? `Delegation conflict: ${user} already has an active delegation for this period`
          : 'Delegation conflict: overlapping delegation period',
        { duration: 5000, icon: icon('!') },
      );
    },

    createFailed(resource) {
      return toast.error(`Failed to create ${resource}`, { duration: DURATIONS.error });
    },

    updateFailed(resource) {
      return toast.error(`Failed to update ${resource}`, { duration: DURATIONS.error });
    },

    deleteFailed(resource) {
      return toast.error(`Failed to delete ${resource}`, { duration: DURATIONS.error });
    },

    operationFailed(operation) {
      return toast.error(`${operation} failed. Please try again.`, { duration: DURATIONS.error });
    },
  },

  loading: {
    saving(message = 'Saving...') {
      return toast.loading(message, { duration: DURATIONS.loading });
    },

    creating(resource = 'Resource') {
      return toast.loading(`Creating ${resource}...`, { duration: DURATIONS.loading });
    },

    deleting(resource = 'Resource') {
      return toast.loading(`Deleting ${resource}...`, { duration: DURATIONS.loading });
    },
  },

  dismiss(toastId) {
    toast.dismiss(toastId);
  },
};
