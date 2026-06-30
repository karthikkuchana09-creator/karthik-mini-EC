import DataTable from '../common/DataTable';

const STATUS_STYLES = {
  PLANNED: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  ACTIVE: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  ON_HOLD: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  COMPLETED: { bg: 'bg-indigo-50', text: 'text-indigo-700', dot: 'bg-indigo-500' },
  CANCELLED: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
};

const PRIORITY_STYLES = {
  LOW: { bg: 'bg-slate-100', text: 'text-slate-600' },
  MEDIUM: { bg: 'bg-blue-50', text: 'text-blue-700' },
  HIGH: { bg: 'bg-orange-50', text: 'text-orange-700' },
  CRITICAL: { bg: 'bg-red-50', text: 'text-red-700' },
};

export default function ProjectTable({ projects, loading, onView, onEdit, onArchive }) {
  const columns = [
    {
      Header: 'Name', accessor: 'name',
      Cell: ({ value, row }) => (
        <span className="font-medium text-gray-900">{value}</span>
      ),
    },
    { Header: 'Owner', accessor: 'owner', Cell: ({ value }) => value || '-' },
    {
      Header: 'Priority', accessor: 'priority', width: '100px',
      Cell: ({ value }) => {
        const style = PRIORITY_STYLES[value] || PRIORITY_STYLES.MEDIUM;
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${style.bg} ${style.text}`}>
            {value}
          </span>
        );
      },
    },
    {
      Header: 'Status', accessor: 'status', width: '110px',
      Cell: ({ value }) => {
        const style = STATUS_STYLES[value] || STATUS_STYLES.PLANNED;
        return (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${style.bg} ${style.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
            {value}
          </span>
        );
      },
    },
    {
      Header: 'Start Date', accessor: 'start_date', width: '110px',
      Cell: ({ value }) => value ? new Date(value).toLocaleDateString() : '-',
    },
    {
      Header: 'End Date', accessor: 'end_date', width: '110px',
      Cell: ({ value }) => value ? new Date(value).toLocaleDateString() : '-',
    },
    {
      Header: 'Actions', id: 'actions', width: '160px', disableSortBy: true,
      Cell: ({ row }) => {
        const isCancelled = row.status === 'CANCELLED';
        return (
          <div className="flex items-center gap-1">
            <button onClick={(e) => { e.stopPropagation(); onView(row); }}
              className="px-2 py-1 text-xs font-medium text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors">View</button>
            {!isCancelled && (
              <button onClick={(e) => { e.stopPropagation(); onEdit(row); }}
                className="px-2 py-1 text-xs font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">Edit</button>
            )}
            {!isCancelled && (
              <button onClick={(e) => { e.stopPropagation(); onArchive(row); }}
                className="px-2 py-1 text-xs font-medium text-gray-600 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors">Cancel</button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={projects}
      loading={loading}
      sortable searchable paginated
      pageSize={10}
      pageSizeOptions={[5, 10, 25, 50]}
      showPageSize
      emptyTitle="No projects"
      emptyMessage="No projects have been created yet."
      onRowClick={(row) => onView(row)}
      rowKey="id"
    />
  );
}
