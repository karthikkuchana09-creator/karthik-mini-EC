export const STATUS_CONFIG = {
  todo: { label: 'To Do', badge: 'badge-warning', pill: 'bg-yellow-100 text-yellow-800 border-yellow-200', dot: 'bg-yellow-500', column: 'border-yellow-500', columnAccent: 'bg-yellow-500' },
  in_progress: { label: 'In Progress', badge: 'badge-info', pill: 'bg-blue-100 text-blue-800 border-blue-200', dot: 'bg-blue-500', column: 'border-blue-500', columnAccent: 'bg-blue-500' },
  review: { label: 'Review', badge: 'badge-purple', pill: 'bg-purple-100 text-purple-800 border-purple-200', dot: 'bg-purple-500', column: 'border-purple-500', columnAccent: 'bg-purple-500' },
  done: { label: 'Done', badge: 'badge-success', pill: 'bg-green-100 text-green-800 border-green-200', dot: 'bg-green-500', column: 'border-green-500', columnAccent: 'bg-green-500' },
};

export const PRIORITY_CONFIG = {
  low: { label: 'Low', badge: 'badge-neutral', dot: 'bg-slate-400' },
  medium: { label: 'Medium', badge: 'badge-warning', dot: 'bg-orange-500' },
  high: { label: 'High', badge: 'badge-danger', dot: 'bg-red-500' },
};

export const APPROVAL_STATUS_CONFIG = {
  pending: { label: 'Pending', badge: 'badge-warning' },
  approved: { label: 'Approved', badge: 'badge-success' },
  rejected: { label: 'Rejected', badge: 'badge-danger' },
  on_hold: { label: 'On Hold', badge: 'badge-neutral' },
};

export const CARD_CLASSES = 'bg-white rounded-xl border border-gray-200 shadow-card hover:shadow-card-hover transition-all duration-200';
export const CARD_NO_HOVER = 'bg-white rounded-xl border border-gray-200 shadow-card';
export const BTN_PRIMARY = 'btn-primary';
export const BTN_SECONDARY = 'btn-secondary';
export const BTN_DANGER = 'btn-danger';
export const BTN_SUCCESS = 'btn-success';
export const BTN_GHOST = 'btn-ghost';
export const INPUT_CLASSES = 'input';
export const INPUT_ERROR_CLASSES = 'input-error';
export const LABEL_CLASSES = 'label';
export const MODAL_OVERLAY = 'fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4';
export const MODAL_CONTENT = 'bg-white rounded-xl shadow-modal max-w-md w-full p-6';
export const EMPTY_STATE = 'bg-white rounded-xl border border-gray-200 shadow-card p-12 text-center';
export const ERROR_ALERT = 'mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700';
export const SUCCESS_ALERT = 'mb-6 p-4 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700';
export const WARNING_ALERT = 'mb-6 p-4 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-700';
export const INFO_ALERT = 'mb-6 p-4 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-700';
