import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getReports, deleteReport } from '../../api/reports';
import { FiBarChart2, FiPlus, FiEdit2, FiTrash2, FiEye, FiDownload } from 'react-icons/fi';

export default function ReportList() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try { const data = await getReports({ page: 1, size: 50 }); setReports(data.items || []); }
    catch { setReports([]); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this report?')) return;
    await deleteReport(id);
    load();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Reports</h1>
          <p className="text-sm text-gray-500 mt-1">Build and view custom reports</p>
        </div>
        <Link to="/reports/new" className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 text-white hover:from-indigo-700 hover:to-indigo-800 transition-all shadow-md">
          <FiPlus className="w-4 h-4" /> New Report
        </Link>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => <div key={i} className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-5 animate-pulse"><div className="h-4 bg-gray-200 rounded w-3/4 mb-3" /><div className="h-3 bg-gray-200 rounded w-1/2" /></div>)}
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-16 bg-white/50 rounded-2xl border border-gray-200/50">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 flex items-center justify-center"><FiBarChart2 className="w-8 h-8 text-gray-400" /></div>
          <p className="text-gray-500 font-semibold">No reports yet</p>
          <p className="text-sm text-gray-400 mt-1">Create your first custom report</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {reports.map(report => (
            <div key={report.id} className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-5 hover:shadow-md transition-shadow group">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-50 to-indigo-100 flex items-center justify-center text-indigo-600 shrink-0"><FiBarChart2 className="w-5 h-5" /></div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-gray-900 truncate">{report.title}</h3>
                  <p className="text-xs text-gray-400">{report.entity_type}</p>
                </div>
              </div>
              {report.description && <p className="text-xs text-gray-500 line-clamp-2 mb-3">{report.description}</p>}
              <div className="flex items-center gap-1 pt-3 border-t border-gray-100">
                <Link to={`/reports/${report.id}`} className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all" title="View"><FiEye className="w-4 h-4" /></Link>
                <Link to={`/reports/${report.id}/edit`} className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all" title="Edit"><FiEdit2 className="w-4 h-4" /></Link>
                <Link to={`/reports/${report.id}/export?format=csv`} className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all" title="Export CSV"><FiDownload className="w-4 h-4" /></Link>
                <button onClick={() => handleDelete(report.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all" title="Delete"><FiTrash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
