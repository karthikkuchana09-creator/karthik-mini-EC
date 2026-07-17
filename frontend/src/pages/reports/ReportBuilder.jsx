import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getReport, createReport, updateReport } from '../../api/reports';
import { FiArrowLeft, FiSave, FiBarChart2, FiTable } from 'react-icons/fi';

const ENTITY_TYPES = [
  { value: 'task', label: 'Tasks', columns: ['id', 'title', 'status', 'priority', 'assigned_to_id', 'created_by_id', 'created_at', 'updated_at'] },
  { value: 'project', label: 'Projects', columns: ['id', 'name', 'status', 'priority', 'created_at'] },
  { value: 'approval', label: 'Approvals', columns: ['id', 'title', 'status', 'approval_type', 'priority', 'created_at'] },
  { value: 'user', label: 'Users', columns: ['id', 'name', 'email', 'role', 'is_active', 'created_at'] },
];

const AGGREGATIONS = ['count', 'sum', 'avg', 'max', 'min'];

export default function ReportBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [report, setReport] = useState({ title: '', description: '', entity_type: 'task', config: { filters: {}, columns: [], group_by: '', aggregations: [], sort_by: '', sort_order: 'desc', limit: 100, chart_type: '' }, is_shared: false });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEdit) getReport(id).then(r => setReport({ title: r.title, description: r.description || '', entity_type: r.entity_type, config: r.config || {}, is_shared: r.is_shared }));
  }, [id]);

  const entityConfig = ENTITY_TYPES.find(e => e.value === report.entity_type) || ENTITY_TYPES[0];

  const toggleColumn = (col) => {
    const cols = report.config.columns || [];
    setReport({ ...report, config: { ...report.config, columns: cols.includes(col) ? cols.filter(c => c !== col) : [...cols, col] } });
  };

  const handleConfigChange = (key, value) => {
    setReport({ ...report, config: { ...report.config, [key]: value } });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEdit) { await updateReport(id, { title: report.title, description: report.description, config: report.config, is_shared: report.is_shared }); }
      else { await createReport(report); }
      navigate('/reports');
    } finally { setSaving(false); }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button onClick={() => navigate('/reports')} className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-indigo-600 mb-6 transition-colors"><FiArrowLeft className="w-4 h-4" />Back</button>
      <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-6 sm:p-8">
        <h1 className="text-xl font-bold text-gray-900 mb-6">{isEdit ? 'Edit Report' : 'Create Report'}</h1>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Title</label>
              <input type="text" value={report.title} onChange={e => setReport({ ...report, title: e.target.value })} required className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30" placeholder="Report title" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Entity Type</label>
              <select value={report.entity_type} onChange={e => setReport({ ...report, entity_type: e.target.value, config: { filters: {}, columns: [], group_by: '', aggregations: [], sort_by: '', sort_order: 'desc', limit: 100, chart_type: '' } })} className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 bg-white">
                {ENTITY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description</label>
            <textarea value={report.description} onChange={e => setReport({ ...report, description: e.target.value })} rows={2} className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
          </div>

          <div className="pt-4 border-t border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Report Configuration</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Group By</label>
                <select value={report.config.group_by || ''} onChange={e => handleConfigChange('group_by', e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 bg-white">
                  <option value="">No grouping</option>
                  {entityConfig.columns.map(col => <option key={col} value={col}>{col}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Chart Type</label>
                <select value={report.config.chart_type || ''} onChange={e => handleConfigChange('chart_type', e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 bg-white">
                  <option value="">Table only</option>
                  <option value="bar">Bar Chart</option>
                  <option value="pie">Pie Chart</option>
                  <option value="line">Line Chart</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Sort By</label>
                <select value={report.config.sort_by || ''} onChange={e => handleConfigChange('sort_by', e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 bg-white">
                  <option value="">No sorting</option>
                  {entityConfig.columns.map(col => <option key={col} value={col}>{col}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Limit</label>
                <input type="number" value={report.config.limit || 100} onChange={e => handleConfigChange('limit', parseInt(e.target.value) || 100)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-500 mb-2">Select Columns</label>
              <div className="flex flex-wrap gap-2">
                {entityConfig.columns.map(col => (
                  <button key={col} type="button" onClick={() => toggleColumn(col)} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${(report.config.columns || []).includes(col) ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'}`}>{col}</button>
                ))}
              </div>
            </div>

            {report.config.group_by && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">Aggregations</label>
                <div className="space-y-2">
                  {(report.config.aggregations || []).map((agg, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <select value={agg.field || ''} onChange={e => { const aggs = [...(report.config.aggregations || [])]; aggs[i] = { ...aggs[i], field: e.target.value }; handleConfigChange('aggregations', aggs); }} className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-white">
                        <option value="">Select field</option>
                        {entityConfig.columns.filter(c => c !== report.config.group_by).map(col => <option key={col} value={col}>{col}</option>)}
                      </select>
                      <select value={agg.type || 'count'} onChange={e => { const aggs = [...(report.config.aggregations || [])]; aggs[i] = { ...aggs[i], type: e.target.value }; handleConfigChange('aggregations', aggs); }} className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-white">
                        {AGGREGATIONS.map(a => <option key={a} value={a}>{a}</option>)}
                      </select>
                      <button type="button" onClick={() => handleConfigChange('aggregations', (report.config.aggregations || []).filter((_, j) => j !== i))} className="p-1 text-gray-400 hover:text-red-600">✕</button>
                    </div>
                  ))}
                  {(report.config.aggregations || []).length < 3 && (
                    <button type="button" onClick={() => handleConfigChange('aggregations', [...(report.config.aggregations || []), { field: entityConfig.columns[0], type: 'count' }])} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">+ Add aggregation</button>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input type="checkbox" id="is_shared" checked={report.is_shared} onChange={e => setReport({ ...report, is_shared: e.target.checked })} className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
            <label htmlFor="is_shared" className="text-sm text-gray-600">Share this report with others</label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <button type="button" onClick={() => navigate('/reports')} className="px-5 py-2.5 text-sm font-medium rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition-all">Cancel</button>
            <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 text-white hover:from-indigo-700 hover:to-indigo-800 disabled:opacity-50 transition-all shadow-md"><FiSave className="w-4 h-4" />{saving ? 'Saving...' : isEdit ? 'Update Report' : 'Create Report'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
