import DataTable from '../common/DataTable';

import { FiRotateCcw } from 'react-icons/fi';

export default function TeamTable({ teams, loading, onView, onEdit, onArchive, onRestore }) {
  const columns = [
    {
      Header: 'Name',
      accessor: 'name',
    },
    {
      Header: 'Description',
      accessor: 'description',
      Cell: ({ value }) => (
        <span className="text-gray-500 truncate block max-w-[250px]">
          {value || '-'}
        </span>
      ),
    },
    {
      Header: 'Status',
      accessor: 'is_archived',
      width: '100px',
      Cell: ({ value }) => {
        const isArchived = value;
        return (
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
              isArchived ? 'bg-gray-100 text-gray-600' : 'bg-emerald-50 text-emerald-700'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isArchived ? 'bg-gray-400' : 'bg-emerald-500'}`} />
            {isArchived ? 'Archived' : 'Active'}
          </span>
        );
      },
    },
    {
      Header: 'Lead',
      accessor: 'lead',
      width: '130px',
      Cell: ({ value }) => value || '-',
    },
    {
      Header: 'Members',
      accessor: 'member_count',
      width: '90px',
      Cell: ({ value }) => value ?? '-',
    },
    {
      Header: 'Created',
      accessor: 'created_at',
      width: '120px',
      Cell: ({ value }) => (value ? new Date(value).toLocaleDateString() : '-'),
    },
    {
      Header: 'Actions',
      id: 'actions',
      width: '160px',
      disableSortBy: true,
      Cell: ({ row }) => {
        const isArchived = row.is_archived;
        return (
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => { e.stopPropagation(); onView(row); }}
              className="px-2 py-1 text-xs font-medium text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
            >
              View
            </button>
            {!isArchived && (
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(row); }}
                className="px-2 py-1 text-xs font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
              >
                Edit
              </button>
            )}
            {isArchived ? (
              <button
                onClick={(e) => { e.stopPropagation(); onRestore?.(row); }}
                className="px-2 py-1 text-xs font-medium text-gray-600 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
              >
                <FiRotateCcw className="w-3 h-3 inline mr-0.5" />
                Restore
              </button>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); onArchive(row); }}
                className="px-2 py-1 text-xs font-medium text-gray-600 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
              >
                Archive
              </button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={teams}
      loading={loading}
      sortable
      searchable
      paginated
      pageSize={10}
      pageSizeOptions={[5, 10, 25, 50]}
      showPageSize
      emptyTitle="No teams"
      emptyMessage="No teams have been created yet in this workspace."
      onRowClick={(row) => onView(row)}
      rowKey="id"
    />
  );
}
