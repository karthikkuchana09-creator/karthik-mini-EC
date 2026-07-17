import { useState, useEffect, useCallback } from 'react';
import { FiPieChart, FiRefreshCw } from 'react-icons/fi';
import PlatformPageLayout from '../../components/platform/PlatformPageLayout';
import platformApi from '../../services/platform/platformService';
import { getWorkspaces } from '../../api/workspaces';
import ReportFilters from '../../components/platform/reports/ReportFilters';
import ReportPreview from '../../components/platform/reports/ReportPreview';

export default function PlatformReports() {
  const [reportType, setReportType] = useState('projects');
  const [filters, setFilters] = useState({});
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [workspaces, setWorkspaces] = useState([]);

  const fetchWorkspaces = useCallback(async () => {
    try {
      const res = await getWorkspaces();
      setWorkspaces(Array.isArray(res) ? res : res?.items || res?.data || []);
    } catch { /* optional */ }
  }, []);

  useEffect(() => { fetchWorkspaces(); }, [fetchWorkspaces]);

  const handleReportTypeChange = (type) => {
    setReportType(type);
    setData(null);
    setHasGenerated(false);
    setError(null);
    setFilters({});
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== '') params[k] = v;
      });
      params.page = 1;
      params.size = 100;

      let res;
      switch (reportType) {
        case 'projects':
          res = await platformApi.reports.projects(params);
          break;
        case 'tasks':
          res = await platformApi.reports.tasks(params);
          break;
        case 'approvals':
          res = await platformApi.reports.approvals(params);
          break;
        case 'documents':
          res = await platformApi.reports.documents(params);
          break;
        default:
          throw new Error('Unknown report type');
      }
      setData(res.data);
      setHasGenerated(true);
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || 'Failed to generate report');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFilters({});
    setData(null);
    setHasGenerated(false);
    setError(null);
  };

  return (
    <PlatformPageLayout
      title="Reporting"
      subtitle="Generate and export custom reports across all enterprise modules"
      icon={FiPieChart}
      error={error}
      action={
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-50"
        >
          <FiRefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      }
    >
      <div className="space-y-6">
        <ReportFilters
          reportType={reportType}
          onReportTypeChange={handleReportTypeChange}
          filters={filters}
          onFilterChange={handleFilterChange}
          onGenerate={handleGenerate}
          onReset={handleReset}
          loading={loading}
          workspaces={workspaces}
        />

        <ReportPreview
          data={data}
          loading={loading}
          reportType={reportType}
          hasGenerated={hasGenerated}
        />
      </div>
    </PlatformPageLayout>
  );
}
