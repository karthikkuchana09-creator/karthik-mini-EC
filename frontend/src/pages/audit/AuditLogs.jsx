import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import FilterBar from '../../components/common/FilterBar';
import DateRangeFilter from '../../components/common/DateRangeFilter';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import EmptyState from '../../components/common/EmptyState';
import { Modal } from '../../components/ui';
import {
  FiShield, FiEye, FiClock, FiGlobe, FiMonitor, FiUser, FiCode,
} from 'react-icons/fi';
import { BTN_SECONDARY } from '../../config/ui';
import * as auditApi from '../../api/audit_logs';

const ACTION_STYLES = {
  CREATE: 'bg-green-100 text-green-700',
  UPDATE: 'bg-blue-100 text-blue-700',
  DELETE: 'bg-red-100 text-red-700',
  LOGIN: 'bg-purple-100 text-purple-700',
  VIEW: 'bg-gray-100 text-gray-700',
};

const MODULE_OPTIONS = [
  { value: 'task', label: 'Task' },
  { value: 'user', label: 'User' },
  { value: 'approval', label: 'Approval' },
  { value: 'organization', label: 'Organization' },
  { value: 'sla_rule', label: 'SLA Rule' },
  { value: 'subscription', label: 'Subscription' },
  { value: 'payment', label: 'Payment' },
  { value: 'document', label: 'Document' },
  { value: 'notification', label: 'Notification' },
];

function JsonDiff({ data, label }) {
  if (!data) return <span className="text-xs text-gray-400 italic">None</span>;
  const formatted = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</p>
      <pre className="text-xs bg-gray-900 text-gray-100 p-3 rounded-lg overflow-x-auto max-h-48 leading-relaxed font-mono">
        {formatted}
      </pre>
    </div>
  );
}

export default function AuditLogs() {
  const [filters, setFilters] = useState({});
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [detailEntry, setDetailEntry] = useState(null);

  const queryParams = {
    ...filters,
    start_date: startDate || undefined,
    end_date: endDate || undefined,
  };

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['audit-logs', queryParams],
    queryFn: () => auditApi.getAuditLogs(queryParams),
  });

  const { data: detailData, isLoading: detailLoading } = useQuery({
    queryKey: ['audit-log-detail', detailEntry?.id],
    queryFn: () => auditApi.getAuditLogById(detailEntry.id),
    enabled: !!detailEntry,
  });

  function handleFilterChange(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value || undefined }));
  }

  function handleFilterClear() {
    setFilters({});
    setStartDate('');
    setEndDate('');
  }

  const logs = useMemo(() => {
    const raw = Array.isArray(data) ? data : data?.items || data?.data || [];
    return raw;
  }, [data]);

  const columns = useMemo(() => [
    {
      Header: 'Log ID',
      accessor: 'id',
      sortable: true,
      Cell: ({ value }) => (
        <span className="text-xs font-mono text-gray-500">#{value}</span>
      ),
    },
    {
      Header: 'User',
      accessor: 'actor_id',
      sortable: true,
      Cell: ({ value, row }) => {
        const name = row?.original?.actor?.name || row?.actor?.name;
        const email = row?.original?.actor?.email || row?.actor?.email;
        return (
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
              <FiUser className="w-3.5 h-3.5 text-indigo-600" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{name || value || 'System'}</p>
              {email && <p className="text-xs text-gray-400 truncate">{email}</p>}
            </div>
          </div>
        );
      },
    },
    {
      Header: 'Module',
      accessor: 'entity_type',
      sortable: true,
      Cell: ({ value }) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 capitalize">
          {value?.replace(/_/g, ' ') || '-'}
        </span>
      ),
    },
    {
      Header: 'Action Type',
      accessor: 'action',
      sortable: true,
      Cell: ({ value }) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${ACTION_STYLES[value] || 'bg-gray-100 text-gray-700'}`}>
          {value || '-'}
        </span>
      ),
    },
    {
      Header: 'Record ID',
      accessor: 'entity_id',
      Cell: ({ value }) => (
        <span className="text-xs font-mono text-gray-600">{value || '-'}</span>
      ),
    },
    {
      Header: 'IP Address',
      accessor: 'ip_address',
      Cell: ({ value }) => (
        <span className="text-xs text-gray-500 font-mono">{value || '-'}</span>
      ),
    },
    {
      Header: 'Created At',
      accessor: 'timestamp',
      sortable: true,
      Cell: ({ value }) => (
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <FiClock className="w-3 h-3 flex-shrink-0" />
          <span>{value ? new Date(value).toLocaleString() : '-'}</span>
        </div>
      ),
    },
    {
      Header: 'Actions',
      accessor: 'actions',
      disableSortBy: true,
      Cell: ({ row }) => (
        <button
          onClick={(e) => { e.stopPropagation(); setDetailEntry(row.original); }}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
        >
          <FiEye className="w-3.5 h-3.5" />
          View Details
        </button>
      ),
    },
  ], []);

  const filterConfig = [
    {
      key: 'entity_type', label: 'Module', type: 'select',
      options: MODULE_OPTIONS,
    },
    {
      key: 'actor_id', label: 'User', type: 'text', placeholder: 'Search by user ID or name...',
    },
  ];

  if (isLoading) return <LoadingSpinner fullPage />;
  if (error) return <ErrorMessage message={error.message} onRetry={refetch} fullPage />;

  return (
    <div className="page-container">
      <PageHeader
        title="Audit Logs"
        subtitle="Track all activities across the platform"
      />

      <div className="mb-6 card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <FilterBar
            filters={filterConfig}
            values={filters}
            onChange={handleFilterChange}
            onClear={handleFilterClear}
          />
          <DateRangeFilter
            startDate={startDate}
            endDate={endDate}
            onStartChange={setStartDate}
            onEndChange={setEndDate}
          />
        </div>
      </div>

      {logs.length === 0 ? (
        <EmptyState icon={FiShield} title="No audit logs" message="No audit log entries match your criteria." />
      ) : (
        <div className="card">
          <div className="p-5">
            <DataTable
              columns={columns}
              data={logs}
              sortable
              paginated
              pageSize={25}
              showPageSize
              pageSizeOptions={[10, 25, 50, 100]}
              rowKey="id"
            />
          </div>
        </div>
      )}

      <Modal
        isOpen={!!detailEntry}
        onClose={() => setDetailEntry(null)}
        title="Audit Log Details"
        size="full"
      >
        {detailLoading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : detailData ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <FiUser className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-500">Actor:</span>
                  <span className="font-medium text-gray-900">
                    {detailData.actor?.name || detailData.actor_id || 'System'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <FiCode className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-500">Module:</span>
                  <span className="font-medium text-gray-900 capitalize">
                    {detailData.entity_type?.replace(/_/g, ' ') || '-'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <FiCode className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-500">Record ID:</span>
                  <span className="font-mono font-medium text-gray-900">{detailData.entity_id || '-'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500">Action:</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${ACTION_STYLES[detailData.action] || 'bg-gray-100 text-gray-700'}`}>
                    {detailData.action || '-'}
                  </span>
                </div>
                {detailData.description && (
                  <div className="flex items-start gap-2 text-sm">
                    <span className="text-gray-500 flex-shrink-0">Description:</span>
                    <span className="text-gray-900">{detailData.description}</span>
                  </div>
                )}
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <FiClock className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-500">Timestamp:</span>
                  <span className="font-medium text-gray-900">
                    {detailData.timestamp ? new Date(detailData.timestamp).toLocaleString() : '-'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <FiGlobe className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-500">IP Address:</span>
                  <span className="font-mono font-medium text-gray-900">{detailData.ip_address || '-'}</span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <FiMonitor className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div className="min-w-0">
                    <span className="text-gray-500">User Agent:</span>
                    <p className="font-mono text-xs text-gray-700 mt-0.5 break-all">{detailData.user_agent || '-'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-5">
              <h4 className="text-sm font-semibold text-gray-900 mb-4">Data Changes</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <JsonDiff data={detailData.old_data || detailData.old_value} label="Old Data" />
                <JsonDiff data={detailData.new_data || detailData.new_value} label="New Data" />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setDetailEntry(null)}
                className={BTN_SECONDARY}
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-sm text-gray-500">Unable to load audit log details.</div>
        )}
      </Modal>
    </div>
  );
}
