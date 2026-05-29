import FilterBar from '../common/FilterBar';
import DateRangeFilter from '../common/DateRangeFilter';

export default function AuditFilters({ values, onChange, onClear, startDate, endDate, onStartChange, onEndChange }) {
  const filters = [
    { key: 'entity_type', label: 'Entity', type: 'select', options: [
      { value: 'task', label: 'Task' }, { value: 'user', label: 'User' },
      { value: 'approval', label: 'Approval' }, { value: 'organization', label: 'Organization' },
      { value: 'sla_rule', label: 'SLA Rule' }, { value: 'subscription', label: 'Subscription' },
    ]},
    { key: 'action', label: 'Action', type: 'select', options: [
      { value: 'CREATE', label: 'Create' }, { value: 'UPDATE', label: 'Update' },
      { value: 'DELETE', label: 'Delete' }, { value: 'LOGIN', label: 'Login' },
      { value: 'VIEW', label: 'View' },
    ]},
    { key: 'actor_id', label: 'Actor ID', type: 'text', placeholder: 'User ID...' },
  ];

  return (
    <div className="flex flex-wrap items-center gap-3">
      <FilterBar filters={filters} values={values} onChange={onChange} onClear={onClear} />
      <DateRangeFilter startDate={startDate} endDate={endDate} onStartChange={onStartChange} onEndChange={onEndChange} />
    </div>
  );
}
