import FilterBar from '../common/FilterBar';

export default function TaskFilters({ values, onChange, onClear }) {
  const filters = [
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { value: 'todo', label: 'To Do' },
        { value: 'in_progress', label: 'In Progress' },
        { value: 'review', label: 'Review' },
        { value: 'done', label: 'Done' },
      ],
    },
    {
      key: 'priority',
      label: 'Priority',
      type: 'select',
      options: [
        { value: 'high', label: 'High' },
        { value: 'medium', label: 'Medium' },
        { value: 'low', label: 'Low' },
      ],
    },
    { key: 'search', label: 'Search', type: 'text', placeholder: 'Search tasks...' },
  ];

  return <FilterBar filters={filters} values={values} onChange={onChange} onClear={onClear} />;
}
