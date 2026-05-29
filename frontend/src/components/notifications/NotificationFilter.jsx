export default function NotificationFilter({ types = [], selected, onChange }) {
  const allTypes = [
    { value: 'all', label: 'All' },
    { value: 'approval', label: 'Approvals' },
    { value: 'task_assigned', label: 'Assignments' },
    { value: 'comment', label: 'Comments' },
    { value: 'alert', label: 'Alerts' },
  ];

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {allTypes.map((type) => (
        <button
          key={type.value}
          onClick={() => onChange(type.value)}
          className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
            (selected || 'all') === type.value
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          {type.label}
        </button>
      ))}
    </div>
  );
}
