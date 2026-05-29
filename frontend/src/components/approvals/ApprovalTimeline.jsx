import { FiCheck, FiX, FiClock, FiSend } from 'react-icons/fi';

const actionIcons = {
  submitted: FiSend,
  approved: FiCheck,
  rejected: FiX,
  pending: FiClock,
};

const actionColors = {
  submitted: 'text-blue-500 bg-blue-100',
  approved: 'text-green-500 bg-green-100',
  rejected: 'text-red-500 bg-red-100',
  pending: 'text-yellow-500 bg-yellow-100',
};

export default function ApprovalTimeline({ steps = [] }) {
  if (!steps.length) return <p className="text-sm text-gray-500 text-center py-8">No history available</p>;

  return (
    <div className="flow-root">
      <ul className="-mb-8">
        {steps.map((step, idx) => {
          const Icon = actionIcons[step.action] || FiClock;
          const color = actionColors[step.action] || 'text-gray-500 bg-gray-100';
          return (
            <li key={idx}>
              <div className="relative pb-8">
                {idx < steps.length - 1 && <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" />}
                <div className="relative flex gap-3">
                  <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${color}`}>
                    <Icon className="w-4 h-4" />
                  </span>
                  <div className="flex-1 min-w-0 pt-1">
                    <p className="text-sm font-medium text-gray-900">{step.label || step.action}</p>
                    {step.comment && <p className="text-sm text-gray-500 mt-0.5">{step.comment}</p>}
                    <p className="text-xs text-gray-400 mt-0.5">
                      {step.actor?.name || 'System'} &middot; {step.timestamp ? new Date(step.timestamp).toLocaleString() : ''}
                    </p>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
