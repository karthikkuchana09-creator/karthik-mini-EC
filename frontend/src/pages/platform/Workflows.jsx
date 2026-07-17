import { useState, useEffect, useCallback } from 'react';
import { FiGitBranch, FiPlus, FiRefreshCw, FiFilter, FiSearch } from 'react-icons/fi';
import platformApi from '../../services/platform/platformService';
import { useRolePermissions } from '../../hooks/useRolePermissions';
import PlatformPageLayout from '../../components/platform/PlatformPageLayout';
import WorkflowTable from '../../components/platform/workflows/WorkflowTable';
import CreateWorkflowModal from '../../components/platform/workflows/CreateWorkflowModal';
import EditWorkflowModal from '../../components/platform/workflows/EditWorkflowModal';
import WorkflowRuleModal from '../../components/platform/workflows/WorkflowRuleModal';
import ExecutionHistoryDrawer from '../../components/platform/workflows/ExecutionHistoryDrawer';
import toast from 'react-hot-toast';

const ENTITY_TYPES = ['', 'TASK', 'APPROVAL', 'PROJECT', 'MEETING'];
const STATUS_OPTIONS = ['', 'active', 'inactive'];

export default function PlatformWorkflows() {
  const { isAdminOrManager } = useRolePermissions();

  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals / Drawer
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [ruleTarget, setRuleTarget] = useState(null);
  const [editingRule, setEditingRule] = useState(null);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [execTarget, setExecTarget] = useState(null);

  const loadWorkflows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page: 1, size: 100 };
      if (entityFilter) params.entity_type = entityFilter;
      const res = await platformApi.workflows.list(params);
      const data = res.data;
      const items = data.items || data.data || [];
      setWorkflows(items);
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || 'Failed to load workflows');
    } finally {
      setLoading(false);
    }
  }, [entityFilter]);

  useEffect(() => { loadWorkflows(); }, [loadWorkflows]);

  const handleCreate = async (data) => {
    await platformApi.workflows.create(data);
    toast.success('Workflow created successfully');
    loadWorkflows();
  };

  const handleEdit = async (id, data) => {
    await platformApi.workflows.update(id, data);
    toast.success('Workflow updated successfully');
    loadWorkflows();
  };

  const handleDelete = async (workflow) => {
    await platformApi.workflows.delete(workflow.id);
    toast.success('Workflow deleted');
    loadWorkflows();
  };

  const handleToggleStatus = async (workflow) => {
    const newStatus = workflow.status === 'active' ? 'inactive' : 'active';
    await platformApi.workflows.update(workflow.id, { status: newStatus });
    toast.success(`Workflow ${newStatus === 'active' ? 'activated' : 'deactivated'}`);
    loadWorkflows();
  };

  const handleRuleSubmit = async (workflowId, ruleId, data) => {
    if (ruleId) {
      await platformApi.workflows.updateRule(ruleId, data);
      toast.success('Rule updated');
    } else {
      await platformApi.workflows.createRule(workflowId, data);
      toast.success('Rule added');
    }
    loadWorkflows();
  };

  const handleOpenRuleModal = (workflow) => {
    setRuleTarget(workflow);
    setEditingRule(null);
    setShowRuleModal(true);
  };

  const handleEditRule = (workflow, rule) => {
    setRuleTarget(workflow);
    setEditingRule(rule);
    setShowRuleModal(true);
  };

  const handleDeleteRule = async (workflowId, ruleId) => {
    await platformApi.workflows.deleteRule(ruleId);
    toast.success('Rule deleted');
    loadWorkflows();
  };

  const filteredWorkflows = workflows.filter((w) => {
    if (search && !w.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter && w.status !== statusFilter) return false;
    return true;
  });

  return (
    <PlatformPageLayout
      title="Workflow Automation"
      subtitle="Design, manage, and execute automated workflow rules across your enterprise"
      icon={FiGitBranch}
      action={
        <div className="flex items-center gap-2">
          {isAdminOrManager && (
            <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-sm font-semibold rounded-xl shadow-md hover:from-indigo-600 hover:to-violet-600 transition-all duration-200">
              <FiPlus className="w-4 h-4" />
              New Workflow
            </button>
          )}
        </div>
      }
    >
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search workflows..."
            className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all"
          />
        </div>

        <div className="flex items-center gap-2">
          <FiFilter className="w-4 h-4 text-gray-400" />
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300"
          >
            <option value="">All Types</option>
            {ENTITY_TYPES.filter(Boolean).map((t) => (
              <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <button onClick={loadWorkflows} disabled={loading} className="btn-icon" title="Refresh">
          <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
      )}

      <WorkflowTable
        workflows={filteredWorkflows}
        loading={loading}
        onEdit={(wf) => setEditTarget(wf)}
        onManageRules={handleOpenRuleModal}
        onViewExecutions={(wf) => setExecTarget(wf)}
        onToggleStatus={handleToggleStatus}
        onDelete={handleDelete}
        onRefresh={loadWorkflows}
      />

      <CreateWorkflowModal isOpen={showCreate} onClose={() => setShowCreate(false)} onSubmit={handleCreate} />

      <EditWorkflowModal isOpen={!!editTarget} onClose={() => setEditTarget(null)} onSubmit={handleEdit} workflow={editTarget} />

      <WorkflowRuleModal
        isOpen={showRuleModal}
        onClose={() => { setShowRuleModal(false); setEditingRule(null); setRuleTarget(null); }}
        onSubmit={handleRuleSubmit}
        rule={editingRule}
        workflowId={ruleTarget?.id}
      />

      <ExecutionHistoryDrawer isOpen={!!execTarget} onClose={() => setExecTarget(null)} workflow={execTarget} />

      {/* Rule management in a bottom section when viewing a workflow's rules */}
      {ruleTarget && !showRuleModal && (
        <div className="mt-6 bg-white rounded-2xl border border-gray-200/70 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Rules: {ruleTarget.name}</h3>
              <p className="text-xs text-gray-500 mt-0.5">Manage workflow rules and conditions</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setRuleTarget(null)} className="btn-sm btn-secondary">Close</button>
              {isAdminOrManager && (
                <button onClick={() => { setEditingRule(null); setShowRuleModal(true); }} className="btn-sm btn-primary">Add Rule</button>
              )}
            </div>
          </div>

          {(!ruleTarget.rules || ruleTarget.rules.length === 0) ? (
            <div className="p-12 flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center mb-3">
                <FiGitBranch className="w-6 h-6 text-gray-300" />
              </div>
              <p className="text-sm font-semibold text-gray-700 mb-1">No rules defined</p>
              <p className="text-xs text-gray-400">Add rules to define when and how this workflow triggers.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {ruleTarget.rules.map((rule) => (
                <div key={rule.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${rule.is_active ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{rule.name}</p>
                      <p className="text-xs text-gray-500">
                        Priority {rule.priority}
                        {rule.condition_config?.field && <> · {rule.condition_config.field} {rule.condition_config.operator} {rule.condition_config.value}</>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-4">
                    {isAdminOrManager && (
                      <>
                        <button onClick={() => handleEditRule(ruleTarget, rule)} className="btn-icon" title="Edit rule">
                          <FiGitBranch className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDeleteRule(ruleTarget.id, rule.id)} className="btn-icon hover:!text-red-500" title="Delete rule">
                          <FiPlus className="w-3.5 h-3.5 rotate-45" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </PlatformPageLayout>
  );
}
