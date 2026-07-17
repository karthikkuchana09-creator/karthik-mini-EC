import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getWorkflow, createWorkflow, updateWorkflow, addStage, updateStage, deleteStage, addTransition } from '../../api/workflows';
import { FiArrowLeft, FiSave, FiPlus, FiTrash2, FiGitBranch, FiGitCommit } from 'react-icons/fi';

const ENTITY_TYPES = ['task', 'approval', 'document', 'project', 'meeting'];

function StageBlock({ stage, index, onUpdate, onDelete }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 relative">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.color || '#6366f1' }} />
          <span className="text-sm font-semibold text-gray-700">Stage {index + 1}</span>
        </div>
        <button type="button" onClick={onDelete} className="p-1 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"><FiTrash2 className="w-3.5 h-3.5" /></button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
          <input type="text" value={stage.name} onChange={e => onUpdate(index, { ...stage, name: e.target.value })} className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30" placeholder="Stage name" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Label</label>
          <input type="text" value={stage.label || ''} onChange={e => onUpdate(index, { ...stage, label: e.target.value })} className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30" placeholder="Display label" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Color</label>
          <input type="text" value={stage.color || ''} onChange={e => onUpdate(index, { ...stage, color: e.target.value })} className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30" placeholder="#6366f1" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Required Approvals</label>
          <input type="number" value={stage.required_approvals || 0} onChange={e => onUpdate(index, { ...stage, required_approvals: parseInt(e.target.value) || 0 })} className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
        </div>
      </div>
    </div>
  );
}

export default function WorkflowBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [wf, setWf] = useState({ name: '', description: '', entity_type: 'task', status: 'active', stages: [], transitions: [] });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEdit) getWorkflow(id).then(d => setWf({ name: d.name, description: d.description || '', entity_type: d.entity_type, status: d.status, stages: d.stages || [], transitions: d.transitions || [] }));
  }, [id]);

  const addStage = () => {
    setWf({ ...wf, stages: [...wf.stages, { name: '', label: '', stage_order: wf.stages.length, color: '#6366f1', assignee_type: null, assignee_id: null, required_approvals: 0 }] });
  };

  const updateStage = (index, stage) => {
    const stages = [...wf.stages];
    stages[index] = stage;
    setWf({ ...wf, stages });
  };

  const removeStage = (index) => {
    setWf({ ...wf, stages: wf.stages.filter((_, i) => i !== index) });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...wf, stages: wf.stages.map((s, i) => ({ ...s, stage_order: i })) };
      if (isEdit) { await updateWorkflow(id, { name: wf.name, description: wf.description, status: wf.status }); } else { await createWorkflow(payload); }
      navigate('/workflows');
    } finally { setSaving(false); }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button onClick={() => navigate('/workflows')} className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-indigo-600 mb-6 transition-colors"><FiArrowLeft className="w-4 h-4" />Back</button>
      <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-6 sm:p-8">
        <h1 className="text-xl font-bold text-gray-900 mb-6">{isEdit ? 'Edit Workflow' : 'Create Workflow'}</h1>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Name</label>
              <input type="text" value={wf.name} onChange={e => setWf({ ...wf, name: e.target.value })} required className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30" placeholder="e.g. Task Approval Workflow" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Entity Type</label>
              <select value={wf.entity_type} onChange={e => setWf({ ...wf, entity_type: e.target.value })} className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 bg-white">
                {ENTITY_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description</label>
            <textarea value={wf.description} onChange={e => setWf({ ...wf, description: e.target.value })} rows={2} className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
          </div>

          <div className="pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-700">Stages</h2>
              <button type="button" onClick={addStage} className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-all"><FiPlus className="w-3.5 h-3.5" /> Add Stage</button>
            </div>
            <div className="space-y-3">
              {wf.stages.length === 0 && <div className="text-center py-8 text-gray-400 text-sm">No stages yet. Add stages to build your workflow pipeline.</div>}
              {wf.stages.map((stage, i) => <StageBlock key={i} stage={stage} index={i} onUpdate={updateStage} onDelete={() => removeStage(i)} />)}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <button type="button" onClick={() => navigate('/workflows')} className="px-5 py-2.5 text-sm font-medium rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition-all">Cancel</button>
            <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 text-white hover:from-indigo-700 hover:to-indigo-800 disabled:opacity-50 transition-all shadow-md"><FiSave className="w-4 h-4" />{saving ? 'Saving...' : isEdit ? 'Update Workflow' : 'Create Workflow'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
