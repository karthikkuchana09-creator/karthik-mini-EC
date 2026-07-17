import { useState, useEffect, useCallback } from 'react';
import { FiMessageSquare, FiPlus, FiRefreshCw, FiFilter, FiSearch, FiBell, FiMail, FiGlobe } from 'react-icons/fi';
import platformApi from '../../services/platform/platformService';
import { useRolePermissions } from '../../hooks/useRolePermissions';
import PlatformPageLayout from '../../components/platform/PlatformPageLayout';
import NotificationRuleTable from '../../components/platform/notification-rules/NotificationRuleTable';
import NotificationRuleFormModal from '../../components/platform/notification-rules/NotificationRuleFormModal';
import toast from 'react-hot-toast';

const EVENT_OPTIONS = [
  { value: '', label: 'All Events' },
  { value: 'task_assignment', label: 'Task Assigned' },
  { value: 'approval_request', label: 'Approval Pending' },
  { value: 'meeting_reminder', label: 'Meeting Reminder' },
  { value: 'escalation_alert', label: 'Escalation' },
  { value: 'mention_alert', label: 'Mention' },
  { value: 'document_update', label: 'Document Update' },
];

export default function PlatformNotificationRules() {
  const { isAdminOrManager } = useRolePermissions();

  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [eventFilter, setEventFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  const loadRules = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page: 1, size: 100 };
      if (eventFilter) params.event_type = eventFilter;
      const res = await platformApi.notificationRules.list(params);
      const data = res.data;
      setRules(data.items || data.data || []);
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || 'Failed to load notification rules');
    } finally {
      setLoading(false);
    }
  }, [eventFilter]);

  useEffect(() => { loadRules(); }, [loadRules]);

  const handleCreate = async (data) => {
    await platformApi.notificationRules.create(data);
    toast.success('Notification rule created');
    loadRules();
  };

  const handleEdit = async (id, data) => {
    await platformApi.notificationRules.update(id, data);
    toast.success('Notification rule updated');
    loadRules();
  };

  const handleToggleStatus = async (rule) => {
    await platformApi.notificationRules.update(rule.id, { is_active: !rule.is_active });
    toast.success(`Rule ${rule.is_active ? 'deactivated' : 'activated'}`);
    loadRules();
  };

  const handleDelete = async (rule) => {
    await platformApi.notificationRules.delete(rule.id);
    toast.success('Notification rule deleted');
    loadRules();
  };

  const handleOpenEdit = (rule) => {
    setEditTarget(rule);
    setShowModal(true);
  };

  const handleOpenCreate = () => {
    setEditTarget(null);
    setShowModal(true);
  };

  const handleModalSubmit = async (id, data) => {
    if (id) {
      await handleEdit(id, data);
    } else {
      await handleCreate(data);
    }
  };

  const activeCount = rules.filter((r) => r.is_active).length;
  const emailRules = rules.filter((r) => r.channel === 'email' || r.channel === 'both').length;
  const channelTypes = new Set(rules.map((r) => r.channel)).size;

  const filteredRules = rules.filter((r) => {
    if (search && !r.name.toLowerCase().includes(search.toLowerCase()) && !(r.description || '').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <PlatformPageLayout
      title="Notification Engine"
      subtitle="Define intelligent notification policies for your enterprise workspace"
      icon={FiMessageSquare}
      action={
        <div className="flex items-center gap-2">
          {isAdminOrManager && (
            <button onClick={handleOpenCreate} className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-sm font-semibold rounded-xl shadow-md hover:from-indigo-600 hover:to-violet-600 transition-all duration-200">
              <FiPlus className="w-4 h-4" />
              New Rule
            </button>
          )}
        </div>
      }
    >
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-sm">
              <FiBell className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Active Rules</p>
              <p className="text-xl font-bold text-gray-900">{loading ? '—' : activeCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow-sm">
              <FiMail className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Email Enabled</p>
              <p className="text-xl font-bold text-gray-900">{loading ? '—' : emailRules}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-sm">
              <FiGlobe className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Channels Used</p>
              <p className="text-xl font-bold text-gray-900">{loading ? '—' : channelTypes} / 3</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search rules..."
            className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all"
          />
        </div>

        <div className="flex items-center gap-2">
          <FiFilter className="w-4 h-4 text-gray-400" />
          <select
            value={eventFilter}
            onChange={(e) => setEventFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300"
          >
            {EVENT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <button onClick={loadRules} disabled={loading} className="btn-icon" title="Refresh">
          <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
      )}

      <NotificationRuleTable
        rules={filteredRules}
        loading={loading}
        onEdit={handleOpenEdit}
        onToggleStatus={handleToggleStatus}
        onDelete={handleDelete}
      />

      <NotificationRuleFormModal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditTarget(null); }}
        onSubmit={handleModalSubmit}
        rule={editTarget}
      />
    </PlatformPageLayout>
  );
}
