import { FiDownload, FiFileText, FiBarChart2 } from 'react-icons/fi';

function formatCell(val) {
  if (val === null || val === undefined) return '-';
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}

function formatHeader(col) {
  return col
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function exportCSV(columns, rows, filename) {
  const headers = columns.join(',');
  const data = rows.map((row) =>
    columns.map((col) => {
      const val = row[col];
      const str = val === null || val === undefined ? '' : String(val);
      return str.includes(',') || str.includes('"') || str.includes('\n')
        ? `"${str.replace(/"/g, '""')}"`
        : str;
    }).join(',')
  ).join('\n');
  const blob = new Blob([`${headers}\n${data}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function ReportPreview({ data, loading, reportType, hasGenerated }) {
  const columns = data?.columns || [];
  const rows = data?.rows || [];
  const total = data?.total ?? rows.length;
  const summary = data?.summary;

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-48" />
        </div>
        <div className="p-5 space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4 animate-pulse">
              <div className="h-3 bg-gray-100 rounded" style={{ width: `${40 + i * 10}%` }} />
              <div className="h-3 bg-gray-100 rounded w-16" />
              <div className="h-3 bg-gray-100 rounded w-20" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!hasGenerated) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-12">
        <div className="flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-50 to-indigo-100 flex items-center justify-center mb-4 shadow-sm">
            <FiBarChart2 className="w-8 h-8 text-indigo-400" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900 mb-1">No Report Generated</h3>
          <p className="text-xs text-gray-500 text-center max-w-md">
            Select a report type, configure filters, and click "Generate Report" to preview your data.
          </p>
        </div>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-12">
        <div className="flex flex-col items-center justify-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100 flex items-center justify-center mb-3 shadow-sm">
            <FiFileText className="w-7 h-7 text-amber-400" />
          </div>
          <h4 className="text-sm font-semibold text-gray-900 mb-1">No Results</h4>
          <p className="text-xs text-gray-500 text-center max-w-sm">
            No data found for the selected filters. Try adjusting your criteria.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {summary && (
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
          {Object.entries(summary).map(([key, val]) => (
            <div key={key} className="bg-white rounded-xl border border-gray-200/70 shadow-sm p-3.5">
              <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">{formatHeader(key)}</p>
              <p className="text-lg font-bold text-gray-900 mt-0.5">
                {typeof val === 'object' ? JSON.stringify(val) : String(val)}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Results</span>
            <span className="text-xs text-gray-400">({total} row{total !== 1 ? 's' : ''})</span>
          </div>
          <button
            onClick={() => exportCSV(columns, rows, `${reportType}_report`)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
          >
            <FiDownload className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>

        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50 z-10">
              <tr className="border-b border-gray-200">
                {columns.map((col) => (
                  <th key={col} className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    {formatHeader(col)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map((row, i) => (
                <tr key={i} className="hover:bg-indigo-50/30 transition-colors">
                  {columns.map((col) => (
                    <td key={col} className="px-4 py-2 text-xs text-gray-700 whitespace-nowrap">
                      {formatCell(row[col])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
