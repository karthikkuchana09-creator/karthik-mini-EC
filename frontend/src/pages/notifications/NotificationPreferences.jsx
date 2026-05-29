import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import PageHeader from '../../components/common/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import ToggleSwitch from '../../components/common/ToggleSwitch';
import { FiSave, FiBell, FiMail, FiCheckCircle, FiAlertTriangle, FiFileText, FiList } from 'react-icons/fi';
import { BTN_PRIMARY } from '../../config/ui';
import * as notificationsApi from '../../api/notifications';

const defaultPreferences = {
  in_app_notifications: true,
  email_notifications: true,
  task_notifications: true,
  approval_notifications: true,
  escalation_notifications: true,
  document_notifications: true,
};

const SECTIONS = [
  {
    title: 'Channel Preferences',
    description: 'Choose how you receive notifications',
    icon: FiBell,
    items: [
      { key: 'in_app_notifications', label: 'In-app Notifications', description: 'Receive notifications within the application', icon: FiBell },
      { key: 'email_notifications', label: 'Email Notifications', description: 'Receive notifications via email', icon: FiMail },
    ],
  },
  {
    title: 'Notification Types',
    description: 'Select which events trigger notifications',
    icon: FiList,
    items: [
      { key: 'task_notifications', label: 'Task Notifications', description: 'Task assignments, updates, and comments', icon: FiCheckCircle },
      { key: 'approval_notifications', label: 'Approval Notifications', description: 'Approval requests and status changes', icon: FiFileText },
      { key: 'escalation_notifications', label: 'Escalation Notifications', description: 'Escalation alerts and updates', icon: FiAlertTriangle },
      { key: 'document_notifications', label: 'Document Notifications', description: 'Document sharing and updates', icon: FiFileText },
    ],
  },
];

export default function NotificationPreferences() {
  const queryClient = useQueryClient();
  const [preferences, setPreferences] = useState(defaultPreferences);
  const [hasChanges, setHasChanges] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: () => notificationsApi.getPreferences(),
  });

  useEffect(() => {
    if (data) {
      setPreferences((prev) => ({ ...prev, ...data }));
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: (prefs) => notificationsApi.updatePreferences(prefs),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
      setHasChanges(false);
      toast.success('Notification preferences saved successfully');
    },
    onError: (err) => {
      toast.error(err?.response?.data?.detail || 'Failed to save preferences');
    },
  });

  function handleChange(key, value) {
    setPreferences((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  }

  function handleSave() {
    saveMutation.mutate(preferences);
  }

  if (isLoading) return <LoadingSpinner fullPage />;
  if (error) return <ErrorMessage message={error.message} onRetry={refetch} fullPage />;

  return (
    <div className="page-container max-w-3xl">
      <PageHeader
        title="Notification Preferences"
        subtitle="Choose which notifications you want to receive"
        actions={
          <button
            onClick={handleSave}
            disabled={saveMutation.isPending || !hasChanges}
            className={BTN_PRIMARY}
          >
            {saveMutation.isPending ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Saving...
              </span>
            ) : (
              <>
                <FiSave className="w-4 h-4" />
                {hasChanges ? 'Save Changes' : 'Saved'}
              </>
            )}
          </button>
        }
      />

      <div className="space-y-6">
        {SECTIONS.map((section) => (
          <div key={section.title} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center gap-2">
                <section.icon className="w-5 h-5 text-gray-500" />
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">{section.title}</h2>
                  <p className="text-xs text-gray-500 mt-0.5">{section.description}</p>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 divide-y divide-gray-100">
              {section.items.map((item) => (
                <div key={item.key} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="p-1.5 rounded-lg bg-gray-100 flex-shrink-0 mt-0.5">
                        <item.icon className="w-4 h-4 text-gray-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900">{item.label}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
                      </div>
                    </div>
                    <ToggleSwitch
                      checked={preferences[item.key] ?? true}
                      onChange={(val) => handleChange(item.key, val)}
                      disabled={saveMutation.isPending}
                      size="md"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
          <p className="text-xs text-indigo-700">
            Changes to your notification preferences take effect immediately. You can update these settings at any time.
          </p>
        </div>
      </div>
    </div>
  );
}
