import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import FilterBar from '../../components/common/FilterBar';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import EmptyState from '../../components/common/EmptyState';
import StatusBadge from '../../components/common/StatusBadge';
import SLABadge from '../../components/common/SLABadge';
import { FiPlus, FiClipboard } from 'react-icons/fi';
import { BTN_PRIMARY } from '../../config/ui';
import * as tasksApi from '../../api/tasks';
import { useAuth } from '../../context/AuthContext';

export default function Tasks() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [filters, setFilters] = useState({});

  const { data: tasks, isLoading, error, refetch } = useQuery({
    queryKey: ['tasks', filters],
    queryFn: () => tasksApi.getTasks(),
  });

  const taskList = useMemo(() => {
    const raw = Array.isArray(tasks) ? tasks : tasks?.items || [];
    return raw.filter((t) => {
      if (filters.status && t.status !== filters.status) return false;
      if (filters.priority && t.priority !== filters.priority) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        if (!t.title?.toLowerCase().includes(q) && !t.id?.toString().includes(q)) return false;
      }
      return true;
    });
  }, [tasks, filters]);

  const filterConfig = [
    {
      key: 'status', label: 'Status', type: 'select',
      options: [
        { value: 'todo', label: 'To Do' },
        { value: 'in_progress', label: 'In Progress' },
        { value: 'review', label: 'Review' },
        { value: 'done', label: 'Done' },
      ],
    },
    {
      key: 'priority', label: 'Priority', type: 'select',
      options: [
        { value: 'high', label: 'High' },
        { value: 'medium', label: 'Medium' },
        { value: 'low', label: 'Low' },
      ],
    },
    { key: 'search', label: 'Search', type: 'text', placeholder: 'Search tasks...' },
  ];

  const columns = useMemo(() => [
    {
      Header: 'Task',
      accessor: 'title',
      sortable: true,
      Cell: ({ value, row }) => (
        <div className="flex flex-col">
          <span className="text-sm font-medium text-gray-900 truncate max-w-[200px]">{value}</span>
          <span className="text-xs text-gray-400 font-mono">#{row.original.id}</span>
        </div>
      ),
    },
    {
      Header: 'Status',
      accessor: 'status',
      sortable: true,
      Cell: ({ value }) => <StatusBadge status={value} />,
    },
    {
      Header: 'Priority',
      accessor: 'priority',
      sortable: true,
      Cell: ({ value }) => <StatusBadge status={value} type="priority" />,
    },
    {
      Header: 'SLA Status',
      accessor: 'sla_status',
      sortable: true,
      Cell: ({ row }) => (
        <SLABadge
          deadline={row.original.sla_due_time || row.original.sla_deadline}
          completedAt={row.original.completed_at || row.original.completedAt}
          status={row.original.status}
        />
      ),
    },
    {
      Header: 'SLA Due Time',
      accessor: 'sla_due_time',
      sortable: true,
      Cell: ({ value }) => {
        if (!value) return <span className="text-gray-400">-</span>;
        const d = new Date(value);
        const now = new Date();
        const isOverdue = d < now;
        return (
          <span className={`text-sm ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
            {d.toLocaleString()}
          </span>
        );
      },
    },
    {
      Header: 'Is SLA Breached',
      accessor: 'is_sla_breached',
      Cell: ({ value, row }) => {
        if (value === true || value === 'true') {
          return (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200">
              Breached
            </span>
          );
        }
        const deadline = row.original.sla_due_time || row.original.sla_deadline;
        if (!deadline || row.original.status === 'done' || row.original.completed_at) {
          return <span className="text-gray-400">-</span>;
        }
        const isOverdue = new Date(deadline) < new Date();
        if (isOverdue) {
          return (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200">
              Breached
            </span>
          );
        }
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
            OK
          </span>
        );
      },
    },
    {
      Header: 'Assignee',
      accessor: 'assignee',
      Cell: ({ value }) => {
        if (!value) return <span className="text-gray-400">-</span>;
        return <span className="text-sm text-gray-600">{value.name || value}</span>;
      },
    },
    {
      Header: 'Due Date',
      accessor: 'due_date',
      sortable: true,
      Cell: ({ value }) => value ? new Date(value).toLocaleDateString() : <span className="text-gray-400">-</span>,
    },
  ], []);

  function handleFilterChange(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value || undefined }));
  }

  function handleFilterClear() {
    setFilters({});
  }

  if (isLoading) return <LoadingSpinner fullPage />;
  if (error) return <ErrorMessage message={error.message} onRetry={refetch} fullPage />;

  return (
    <div className="page-container">
      <PageHeader
        title="Tasks"
        subtitle="Browse and manage all tasks with SLA tracking"
        actions={user?.role !== 'employee' && (
          <button onClick={() => navigate('/tasks/create')} className={BTN_PRIMARY}>
            <FiPlus className="w-4 h-4" /> New Task
          </button>
        )}
      />

      <div className="mb-6">
        <FilterBar
          filters={filterConfig}
          values={filters}
          onChange={handleFilterChange}
          onClear={handleFilterClear}
        />
      </div>

      {taskList.length === 0 ? (
        <EmptyState
          icon={FiClipboard}
          title="No tasks found"
          message="No tasks match your current filters."
          action={
            <button onClick={() => navigate('/tasks/create')} className={BTN_PRIMARY}>
              <FiPlus className="w-4 h-4" /> Create Task
            </button>
          }
        />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <DataTable
            columns={columns}
            data={taskList}
            sortable
            searchable
            paginated
            pageSize={10}
            pageSizeOptions={[5, 10, 25, 50]}
            showPageSize
            onRowClick={(row) => navigate(`/tasks/${row.id}`)}
            emptyMessage="No tasks match your filters"
          />
        </div>
      )}
    </div>
  );
}
