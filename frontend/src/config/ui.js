export const STATUS_CONFIG = {
  todo: { label: 'To Do', badge: 'bg-yellow-100 text-yellow-800 border border-yellow-200', pill: 'bg-yellow-100 text-yellow-800 border-yellow-200', dot: 'bg-yellow-500', column: 'border-yellow-500', columnAccent: 'bg-yellow-500' },
  in_progress: { label: 'In Progress', badge: 'bg-blue-100 text-blue-800 border border-blue-200', pill: 'bg-blue-100 text-blue-800 border-blue-200', dot: 'bg-blue-500', column: 'border-blue-500', columnAccent: 'bg-blue-500' },
  review: { label: 'Review', badge: 'bg-purple-100 text-purple-800 border border-purple-200', pill: 'bg-purple-100 text-purple-800 border-purple-200', dot: 'bg-purple-500', column: 'border-purple-500', columnAccent: 'bg-purple-500' },
  done: { label: 'Done', badge: 'bg-green-100 text-green-800 border border-green-200', pill: 'bg-green-100 text-green-800 border-green-200', dot: 'bg-green-500', column: 'border-green-500', columnAccent: 'bg-green-500' },
};

export const PRIORITY_CONFIG = {
  low: { label: 'Low', badge: 'bg-slate-100 text-slate-700 border border-slate-200', dot: 'bg-slate-400' },
  medium: { label: 'Medium', badge: 'bg-orange-100 text-orange-800 border border-orange-200', dot: 'bg-orange-500' },
  high: { label: 'High', badge: 'bg-red-100 text-red-800 border border-red-200', dot: 'bg-red-500' },
};

export const APPROVAL_STATUS_CONFIG = {
  pending: { label: 'Pending', badge: 'bg-yellow-100 text-yellow-800 border border-yellow-200' },
  approved: { label: 'Approved', badge: 'bg-green-100 text-green-800 border border-green-200' },
  rejected: { label: 'Rejected', badge: 'bg-red-100 text-red-800 border border-red-200' },
  on_hold: { label: 'On Hold', badge: 'bg-gray-100 text-gray-700 border border-gray-200' },
};

export const CARD_CLASSES = 'bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200';
export const CARD_NO_HOVER = 'bg-white rounded-xl border border-gray-200 shadow-sm';
export const BTN_PRIMARY = 'inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm';
export const BTN_SECONDARY = 'inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed';
export const BTN_DANGER = 'inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm';
export const BTN_SUCCESS = 'inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm';
export const INPUT_CLASSES = 'w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent hover:border-gray-400 transition-colors';
export const INPUT_ERROR_CLASSES = 'w-full px-3 py-2 text-sm border border-red-300 rounded-lg bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent';
export const MODAL_OVERLAY = 'fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4';
export const MODAL_CONTENT = 'bg-white rounded-xl shadow-xl max-w-md w-full p-6';
export const EMPTY_STATE = 'bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center';
export const ERROR_ALERT = 'mb-6 p-4 rounded-lg bg-red-50 border border-red-200';
export const SUCCESS_ALERT = 'mb-6 p-4 rounded-lg bg-green-50 border border-green-200';
