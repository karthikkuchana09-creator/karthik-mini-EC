const statusMap = {
  pending: { variant: 'warning', label: 'Pending' },
  in_progress: { variant: 'info', label: 'In Progress' },
  completed: { variant: 'success', label: 'Completed' },
  rejected: { variant: 'danger', label: 'Rejected' },
  approved: { variant: 'success', label: 'Approved' },
  on_hold: { variant: 'neutral', label: 'On Hold' },
  submitted: { variant: 'info', label: 'Submitted' },
};

const variants = {
  info: 'bg-blue-100 text-blue-800 border-blue-200',
  success: 'bg-green-100 text-green-800 border-green-200',
  warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  danger: 'bg-red-100 text-red-800 border-red-200',
  neutral: 'bg-gray-100 text-gray-700 border-gray-200',
};

const dotVariants = {
  info: 'bg-blue-500',
  success: 'bg-green-500',
  warning: 'bg-yellow-500',
  danger: 'bg-red-500',
  neutral: 'bg-gray-400',
};

export default function Badge({ status, variant: variantProp, label, className = '', dot = true }) {
  const config = statusMap[status] || { variant: variantProp || 'neutral', label: label || status };
  const colorVariant = variantProp || config.variant;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${variants[colorVariant]} ${className}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotVariants[colorVariant]}`} />}
      {config.label}
    </span>
  );
}
