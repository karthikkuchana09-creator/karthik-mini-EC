import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiPlus, FiGrid, FiList, FiSearch } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { projectService } from '../../services/projectService';
import { getErrorMessage } from '../../utils/errorHandler';
import { CARD_NO_HOVER, BTN_PRIMARY, INPUT_CLASSES } from '../../config/ui';
import CreateProjectModal from '../../components/workspace/CreateProjectModal';
import EditProjectModal from '../../components/workspace/EditProjectModal';
import ProjectCard from '../../components/workspace/ProjectCard';
import ProjectTable from '../../components/workspace/ProjectTable';
import ConfirmModal from '../../components/common/ConfirmModal';
import Breadcrumb from '../../components/ui/Breadcrumb';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import Phase10CErrorState from '../../components/phase10c/ErrorState';

const STATUS_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'PLANNED', label: 'Planned' },
  { key: 'ACTIVE', label: 'Active' },
  { key: 'ON_HOLD', label: 'On Hold' },
  { key: 'COMPLETED', label: 'Completed' },
  { key: 'CANCELLED', label: 'Cancelled' },
];

const PRIORITY_OPTIONS = ['', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export default function Projects() {
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [viewMode, setViewMode] = useState('card');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [archiving, setArchiving] = useState(false);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const data = await projectService.getProjects();
      setProjects(Array.isArray(data) ? data : data?.items || data?.results || []);
    } catch (err) {
      const msg = getErrorMessage(err, 'Failed to load projects');
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const filtered = projects.filter((p) => {
    const q = search.toLowerCase();
    if (q && !p.name?.toLowerCase().includes(q) && !p.description?.toLowerCase().includes(q) && !p.owner?.toLowerCase().includes(q)) return false;
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    if (priorityFilter && p.priority !== priorityFilter) return false;
    return true;
  });

  async function handleCreate(data) {
    try {
      await projectService.createProject(data);
      toast.success('Project created successfully');
      fetchProjects();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to create project'));
      throw err;
    }
  }

  async function handleEdit(data) {
    if (!selectedProject) return;
    try {
      await projectService.updateProject(selectedProject.id, data);
      toast.success('Project updated successfully');
      setSelectedProject(null);
      fetchProjects();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update project'));
      throw err;
    }
  }

  function openEdit(project) { setSelectedProject(project); setShowEditModal(true); }
  function openArchive(project) { setSelectedProject(project); setShowArchiveConfirm(true); }

  async function handleArchive() {
    if (!selectedProject) return;
    setArchiving(true);
    try {
      await projectService.archiveProject(selectedProject.id);
      toast.success('Project cancelled successfully');
      setShowArchiveConfirm(false);
      setSelectedProject(null);
      fetchProjects();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to cancel project'));
    } finally {
      setArchiving(false);
    }
  }

  function handleView(project) { navigate(`/projects/${project.id}`); }
  function handleCloseEdit() { setShowEditModal(false); setSelectedProject(null); }

  const countByStatus = {};
  projects.forEach((p) => { countByStatus[p.status] = (countByStatus[p.status] || 0) + 1; });

  return (
    <div className="page-container">
      <Breadcrumb className="mb-4" items={[
        { label: 'Projects' },
      ]} />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-sm text-gray-500 mt-1">Manage and track all projects</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className={BTN_PRIMARY}>
          <FiPlus className="w-4 h-4" /> New Project
        </button>
      </div>

      <div className={`${CARD_NO_HOVER} p-4 mb-6`}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input className={`${INPUT_CLASSES} pl-10`} placeholder="Search projects..." value={search}
              onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center bg-gray-100 rounded-lg p-0.5 overflow-x-auto">
              {STATUS_FILTERS.map((tab) => {
                const count = tab.key === 'all' ? projects.length : (countByStatus[tab.key] || 0);
                return (
                  <button key={tab.key} onClick={() => setStatusFilter(tab.key)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap ${
                      statusFilter === tab.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}>
                    {tab.label} <span className="ml-1 text-gray-400">({count})</span>
                  </button>
                );
              })}
            </div>
            <select
              className="input py-1.5 text-xs max-w-[110px]"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
            >
              <option value="">All Priority</option>
              {PRIORITY_OPTIONS.filter(Boolean).map((p) => (
                <option key={p} value={p}>{p.charAt(0) + p.slice(1).toLowerCase()}</option>
              ))}
            </select>
            <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
              <button onClick={() => setViewMode('card')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'card' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                title="Card view"><FiGrid className="w-4 h-4" /></button>
              <button onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'table' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                title="Table view"><FiList className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner fullPage text="Loading projects..." />
      ) : error ? (
        <Phase10CErrorState message={error} onRetry={fetchProjects} />
      ) : filtered.length === 0 ? (
        <EmptyState title={search || priorityFilter ? 'No matching projects' : 'No projects yet'}
          message={search || priorityFilter ? 'Try different search or filter criteria' : 'Create your first project to get started.'}
          action={!search && !priorityFilter && (<button onClick={() => setShowCreateModal(true)} className={BTN_PRIMARY}><FiPlus className="w-4 h-4" /> Create Project</button>)}
        />
      ) : viewMode === 'card' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((project) => (
            <ProjectCard key={project.id} project={project} onView={handleView} onEdit={openEdit} onArchive={openArchive} />
          ))}
        </div>
      ) : (
        <ProjectTable projects={filtered} loading={false} onView={handleView} onEdit={openEdit} onArchive={openArchive} />
      )}

      <div className="mt-4 text-xs text-gray-400 text-center">
        Showing {filtered.length} of {projects.length} project{projects.length !== 1 ? 's' : ''}
      </div>

      <CreateProjectModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} onSubmit={handleCreate} />
      <EditProjectModal isOpen={showEditModal} onClose={handleCloseEdit} onSubmit={handleEdit} project={selectedProject} />
      <ConfirmModal isOpen={showArchiveConfirm}
        onClose={() => { setShowArchiveConfirm(false); setSelectedProject(null); }}
        onConfirm={handleArchive}
        title="Cancel Project"
        message={`Are you sure you want to cancel "${selectedProject?.name}"? This action can be reversed later.`}
        confirmText={archiving ? 'Cancelling...' : 'Cancel Project'}
        loading={archiving}
        variant="warning"
      />
    </div>
  );
}
