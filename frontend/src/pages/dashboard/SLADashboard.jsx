import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import FilterBar from '../../components/common/FilterBar';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import EmptyState from '../../components/common/EmptyState';
import SLABadge from '../../components/common/SLABadge';
import CardSection from '../../components/ui/CardSection';
import {
  FiActivity, FiAlertTriangle, FiCheckCircle, FiAlertOctagon, FiEye, FiTarget,
} from 'react-icons/fi';
import * as slaApi from '../../api/sla';

const STATUS_STYLE = {
  active: { label: 'Active', bg: 'bg-blue-100 text-blue-700 border-blue-200' },
  completed: { label: 'Completed', bg: 'bg-green-100 text-green-700 border-green-200' },
  breached: { label: 'Breached', bg: 'bg-red-100 text-red-700 border-red-200' },
  escalated: { label: 'Escalated', bg: 'bg-orange-100 text-orange-700 border-orange-200' },
};

const STATUS_TABS = [
  { key: 'all', label: 'All Records' },
  { key: 'active', label: 'Active' },
  { key: 'completed', label: 'Completed' },
  { key: 'breached', label: 'Breached' },
  { key: 'escalated', label: 'Escalated' },
];

function SummaryCard({ label, value, total, icon: Icon, accent }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  const accentMap = {
    blue: { iconBg: 'bg-blue-50', iconColor: 'text-blue-600', valueColor: 'text-blue-600', barColor: 'bg-blue-500', border: 'border-l-blue-500' },
    red: { iconBg: 'bg-red-50', iconColor: 'text-red-600', valueColor: 'text-red-600', barColor: 'bg-red-500', border: 'border-l-red-500' },
    green: { iconBg: 'bg-green-50', iconColor: 'text-green-600', valueColor: 'text-green-600', barColor: 'bg-green-500', border: 'border-l-green-500' },
    orange: { iconBg: 'bg-orange-50', iconColor: 'text-orange-600', valueColor: 'text-orange-600', barColor: 'bg-orange-500', border: 'border-l-orange-500' },
  };
  const a = accentMap[accent] || accentMap.blue;

  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-card hover:shadow-card-hover transition-all duration-200 border-l-4 ${a.border} p-5`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg ${a.iconBg}`}>
            <Icon className={`w-4 h-4 ${a.iconColor}`} />
          </div>
          <span className="text-sm font-medium text-gray-600">{label}</span>
        </div>
        <span className={`text-2xl font-bold ${a.valueColor} tabular-nums`}>{value}</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${label}: ${pct}%`}>
        <div className={`h-2 rounded-full transition-all duration-500 ease-out ${a.barColor}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-gray-400 mt-1.5">{pct}% of tracked records</p>
    </div>
  );
}

export default function SLADashboard() {
  const [statusTab, setStatusTab] = useState('all');
  const [filters, setFilters] = useState({});

  const activeQuery = useQuery({
    queryKey: ['sla-tracking', 'active'],
    queryFn: () => slaApi.getSlaTrackingActive(),
  });

  const breachedQuery = useQuery({
    queryKey: ['sla-tracking', 'breached'],
    queryFn: () => slaApi.getSlaTrackingBreached(),
  });

  const isLoading = activeQuery.isLoading || breachedQuery.isLoading;
  const error = activeQuery.error || breachedQuery.error;

  const { allRecords, stats } = useMemo(() => {
    const active = (() => {
      const d = activeQuery.data;
      return Array.isArray(d) ? d : d?.items || d?.records || [];
    })();
    const breached = (() => {
      const d = breachedQuery.data;
      return Array.isArray(d) ? d : d?.items || d?.records || [];
    })();

    const activeCount = active.length;
    const breachedCount = breached.length;
    const completedRecords = active.filter((r) => r.completed_time || r.status === 'completed');
    const escalatedRecords = [...active, ...breached].filter((r) => r.escalated || r.status === 'escalated');
    const completedCount = completedRecords.length;
    const escalatedCount = escalatedRecords.length;

    const all = [
      ...active.map((r) => ({ ...r, _status: r.completed_time || r.status === 'completed' ? 'completed' : r.escalated || r.status === 'escalated' ? 'escalated' : 'active' })),
      ...breached.filter((r) => !active.some((a) => a.id === r.id)).map((r) => ({ ...r, _status: r.escalated || r.status === 'escalated' ? 'escalated' : 'breached' })),
    ];

    const total = all.length || 1;
    return {
      allRecords: all,
      stats: { active: activeCount, breached: breachedCount, completed: completedCount, escalated: escalatedCount, total },
    };
  }, [activeQuery.data, breachedQuery.data]);

  const moduleOptions = useMemo(() => {
    const modules = [...new Set(allRecords.map((r) => r.module_name).filter(Boolean))];
    return modules.map((m) => ({ value: m, label: m }));
  }, [allRecords]);

  const filteredRecords = useMemo(() => {
    let list = allRecords;

    if (statusTab !== 'all') {
      list = list.filter((r) => r._status === statusTab);
    }

    if (filters.module) {
      list = list.filter((r) => r.module_name === filters.module);
    }

    return list;
  }, [allRecords, statusTab, filters]);

  const filterConfig = [
    { key: 'module', label: 'Module', type: 'select', options: moduleOptions },
  ];

  const columns = useMemo(() => [
    {
      Header: 'Module',
      accessor: 'module_name',
      sortable: true,
    },
    {
      Header: 'Record ID',
      accessor: 'record_id',
      sortable: true,
      Cell: ({ value }) => <span className="font-mono text-xs">#{value}</span>,
    },
    {
      Header: 'SLA Status',
      accessor: '_status',
      sortable: true,
      Cell: ({ value, row }) => {
        const style = STATUS_STYLE[value] || STATUS_STYLE.active;
        return (
          <div className="flex flex-col gap-1">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${style.bg}`}>
              {style.label}
            </span>
            <SLABadge
              deadline={row.original.due_time}
              completedAt={row.original.completed_time}
              status={value === 'completed' ? 'done' : undefined}
            />
          </div>
        );
      },
    },
    {
      Header: 'Start Time',
      accessor: 'start_time',
      sortable: true,
      Cell: ({ value }) => value ? new Date(value).toLocaleString() : '-',
    },
    {
      Header: 'Due Time',
      accessor: 'due_time',
      sortable: true,
      Cell: ({ value }) => value ? new Date(value).toLocaleString() : '-',
    },
    {
      Header: 'Completed Time',
      accessor: 'completed_time',
      sortable: true,
      Cell: ({ value }) => value ? new Date(value).toLocaleString() : '-',
    },
    {
      Header: 'Breach Reason',
      accessor: 'breach_reason',
      Cell: ({ value }) => value || '-',
    },
    {
      Header: 'Actions',
      accessor: 'actions',
      disableSortBy: true,
      Cell: ({ row }) => (
        <button
          onClick={() => {
            const mod = row.original.module_name;
            const rid = row.original.record_id;
            if (mod && rid) {
              slaApi.getSlaTrackingRecord(mod, rid).then((record) => {
                const msg = [
                  `Module: ${record.module_name}`,
                  `Status: ${record._status || record.status}`,
                  record.breach_reason ? `Reason: ${record.breach_reason}` : null,
                ].filter(Boolean).join('\n');
                alert(msg);
              }).catch(() => alert('Failed to load record details'));
            }
          }}
          className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
          title="View record details"
          aria-label={`View details for record #${row.original.record_id}`}
        >
          <FiEye className="w-4 h-4" />
        </button>
      ),
    },
  ], []);

  function handleFilterChange(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value || undefined }));
  }

  function handleFilterClear() {
    setFilters({});
  }

  if (isLoading) return <LoadingSpinner fullPage />;
  if (error) return <ErrorMessage message={error.message} onRetry={() => { activeQuery.refetch(); breachedQuery.refetch(); }} fullPage />;

  return (
    <div className="page-container">
      <PageHeader
        title="SLA Dashboard"
        subtitle="Monitor service level agreement compliance across your organization"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <SummaryCard label="Active SLA" value={stats.active} total={stats.total} icon={FiActivity} accent="blue" />
        <SummaryCard label="Breached SLA" value={stats.breached} total={stats.total} icon={FiAlertTriangle} accent="red" />
        <SummaryCard label="Completed Within SLA" value={stats.completed} total={stats.total} icon={FiCheckCircle} accent="green" />
        <SummaryCard label="Escalated SLA" value={stats.escalated} total={stats.total} icon={FiAlertOctagon} accent="orange" />
      </div>

      <CardSection
        title="SLA Tracking Records"
        action={
          <FilterBar
            filters={filterConfig}
            values={filters}
            onChange={handleFilterChange}
            onClear={handleFilterClear}
          />
        }
      >
        <div className="flex items-center gap-1 overflow-x-auto pb-4 -mt-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusTab(tab.key)}
              className={`px-3.5 py-1.5 text-sm font-medium rounded-lg transition-all duration-150 whitespace-nowrap ${
                statusTab === tab.key
                  ? 'bg-indigo-100 text-indigo-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              {tab.label}
              {tab.key !== 'all' && (
                <span className="ml-1.5 text-xs opacity-60">({stats[tab.key] || 0})</span>
              )}
            </button>
          ))}
        </div>

        {filteredRecords.length === 0 ? (
          <EmptyState
            icon={FiTarget}
            title="No SLA records"
            message={statusTab !== 'all' ? `No ${statusTab} SLA records found for the selected filters.` : 'No SLA tracking records available.'}
          />
        ) : (
          <DataTable
            columns={columns}
            data={filteredRecords}
            sortable
            searchable
            paginated
            pageSize={10}
            pageSizeOptions={[5, 10, 25, 50]}
            showPageSize
            emptyMessage="No records match your current filters"
            rowKey="id"
          />
        )}
      </CardSection>
    </div>
  );
}
