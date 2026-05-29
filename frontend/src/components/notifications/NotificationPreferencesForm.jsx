import ToggleSwitch from '../common/ToggleSwitch';

const defaultPreferences = [
  { key: 'task_assigned', label: 'Task Assigned', description: 'When a task is assigned to you' },
  { key: 'task_updated', label: 'Task Updated', description: 'When a task you own is updated' },
  { key: 'approval_requested', label: 'Approval Requested', description: 'When your approval is requested' },
  { key: 'approval_status', label: 'Approval Status', description: 'When an approval request is resolved' },
  { key: 'comment_added', label: 'Comment Added', description: 'When someone comments on your task' },
  { key: 'sla_breach', label: 'SLA Breach', description: 'When a task is at risk of breaching SLA' },
  { key: 'mention', label: 'Mentions', description: 'When someone mentions you' },
  { key: 'system_announcement', label: 'System Announcements', description: 'Important system notifications' },
];

export default function NotificationPreferencesForm({ preferences = {}, onChange, loading = false }) {
  return (
    <div className="space-y-4">
      {defaultPreferences.map((pref) => (
        <div key={pref.key} className="flex items-center justify-between py-3 px-4 bg-white rounded-lg border border-gray-100">
          <div>
            <p className="text-sm font-medium text-gray-900">{pref.label}</p>
            <p className="text-xs text-gray-500">{pref.description}</p>
          </div>
          <ToggleSwitch
            checked={preferences[pref.key] ?? true}
            onChange={(val) => onChange(pref.key, val)}
            disabled={loading}
          />
        </div>
      ))}
    </div>
  );
}
