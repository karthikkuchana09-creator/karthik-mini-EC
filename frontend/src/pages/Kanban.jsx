import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { getKanbanTasks, updateTaskStatus } from '../api/kanban';
import Badge from '../components/ui/Badge';
import { STATUS_CONFIG, PRIORITY_CONFIG } from '../config/ui';

const VALID_TRANSITIONS = {
  todo: ['in_progress'],
  in_progress: ['todo', 'review'],
  review: ['in_progress', 'done'],
  done: ['review'],
};

function isValidTransition(from, to) {
  return VALID_TRANSITIONS[from]?.includes(to) || false;
}

const COLUMNS = [
  { id: 'todo', label: 'TODO', config: STATUS_CONFIG.todo },
  { id: 'in_progress', label: 'IN PROGRESS', config: STATUS_CONFIG.in_progress },
  { id: 'review', label: 'REVIEW', config: STATUS_CONFIG.review },
  { id: 'done', label: 'DONE', config: STATUS_CONFIG.done },
];

function Avatar({ email }) {
  return (
    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-100 to-indigo-200 flex items-center justify-center text-indigo-700 text-[10px] font-semibold ring-2 ring-white shadow-sm shrink-0">
      {email?.charAt(0).toUpperCase() || '?'}
    </div>
  );
}

function TaskCard({ task, index }) {
  const priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.low;

  return (
    <Draggable draggableId={String(task.id)} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`group bg-white rounded-xl border shadow-sm mb-2.5 p-4 transition-all duration-200 ${
            snapshot.isDragging
              ? 'shadow-2xl ring-2 ring-indigo-400/40 rotate-1 scale-[1.03] bg-white'
              : 'border-gray-200/70 hover:border-indigo-200/50 hover:shadow-md hover:-translate-y-0.5'
          }`}
        >
          <Link to={`/tasks/${task.id}`} className="block">
            <h4 className="text-sm font-semibold text-gray-900 mb-1.5 group-hover:text-indigo-600 transition-colors line-clamp-2 leading-snug">
              {task.title}
            </h4>
          </Link>
          {task.description && (
            <p className="text-xs text-gray-500 mb-3 line-clamp-2 leading-relaxed">
              {task.description}
            </p>
          )}
          <div className="flex items-center justify-between">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-medium border ${priority.badge}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${priority.dot}`} />
              {priority.label}
            </span>
            {task.assigned_user?.email && (
              <Avatar email={task.assigned_user.email} />
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
}

function Column({ columnId, title, config, tasks, count }) {
  return (
    <div className="flex flex-col min-w-[280px] w-72 bg-gray-50/80 backdrop-blur-sm rounded-2xl border border-gray-200/70 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3.5 bg-white/80 border-b border-gray-200/50">
        <div className="flex items-center gap-2.5">
          <span className={`w-2.5 h-2.5 rounded-full shadow-sm ${config.dot}`} />
          <span className="text-xs font-bold text-gray-700 uppercase tracking-widest">{title}</span>
        </div>
        <span className="text-xs font-semibold text-gray-500 bg-gray-100/80 px-2.5 py-0.5 rounded-full">
          {count}
        </span>
      </div>

      <Droppable droppableId={columnId}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 min-h-[140px] p-2.5 transition-all duration-200 ${
              snapshot.isDraggingOver ? 'bg-indigo-50/50' : ''
            }`}
          >
            {tasks.map((task, index) => (
              <TaskCard key={task.id} task={task} index={index} />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}

function Kanban() {
  const [columns, setColumns] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [updating, setUpdating] = useState(null);

  const fetchTasks = useCallback(async () => {
    try {
      const data = await getKanbanTasks();
      const grouped = {};
      COLUMNS.forEach((col) => {
        grouped[col.id] = data[col.id] || [];
      });
      setColumns(grouped);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load kanban board');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  const onDragEnd = async (result) => {
    const { destination, source, draggableId } = result;

    if (!destination || (destination.droppableId === source.droppableId && destination.index === source.index)) {
      return;
    }

    if (!isValidTransition(source.droppableId, destination.droppableId)) {
      const colLabel = COLUMNS.find((c) => c.id === destination.droppableId)?.label || destination.droppableId;
      setError(`Invalid transition: Cannot move directly to ${colLabel}. Follow: TODO → IN PROGRESS → REVIEW → DONE`);
      return;
    }

    const sourceColumn = columns[source.droppableId];
    const destColumn = columns[destination.droppableId];

    const newColumns = { ...columns };
    const sourceTasks = Array.from(sourceColumn);
    const [removed] = sourceTasks.splice(source.index, 1);
    newColumns[source.droppableId] = sourceTasks;

    const destTasks = Array.from(destColumn);
    destTasks.splice(destination.index, 0, removed);
    newColumns[destination.droppableId] = destTasks;

    setColumns(newColumns);
    setUpdating(draggableId);

    try {
      await updateTaskStatus(draggableId, destination.droppableId);
      setSuccess(`Task moved to ${COLUMNS.find((c) => c.id === destination.droppableId)?.label}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update task status');
      await fetchTasks();
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-[3px] border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500 font-medium">Loading kanban board...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Kanban Board</h1>
            <p className="text-sm text-gray-500 mt-1.5">Drag and drop tasks between columns</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-5 text-sm bg-white/80 backdrop-blur-sm px-4 py-2.5 rounded-xl border border-gray-200/70 shadow-sm w-fit">
          <span className="font-medium text-gray-400 text-xs uppercase tracking-wider mr-1">Flow:</span>
          {['TODO', 'IN PROGRESS', 'REVIEW', 'DONE'].map((label, i, arr) => (
            <span key={label} className="flex items-center gap-2">
              <span className="font-semibold text-gray-800 text-xs">{label}</span>
              {i < arr.length - 1 && (
                <svg className="w-3.5 h-3.5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              )}
            </span>
          ))}
        </div>
      </div>

      {(error || success) && (
        <div className={`mb-6 p-4 rounded-xl border shadow-sm backdrop-blur-sm ${
          error ? 'bg-red-50/90 border-red-200/70' : 'bg-green-50/90 border-green-200/70'
        }`}>
          <div className="flex items-start gap-2.5">
            {error ? (
              <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            ) : (
              <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
            <p className={`text-sm font-medium ${error ? 'text-red-800' : 'text-green-800'}`}>
              {error || success}
            </p>
          </div>
        </div>
      )}

      <div className="overflow-x-auto pb-4 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-4 min-w-fit">
            {COLUMNS.map((col) => (
              <Column
                key={col.id}
                columnId={col.id}
                title={col.label}
                config={col.config}
                tasks={columns[col.id] || []}
                count={(columns[col.id] || []).length}
              />
            ))}
          </div>
        </DragDropContext>
      </div>
    </div>
  );
}

export default Kanban;
