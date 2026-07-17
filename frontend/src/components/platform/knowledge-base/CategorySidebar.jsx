import { useState } from 'react';
import { FiFolder, FiPlus, FiEdit2, FiTrash2, FiX, FiCheck, FiBookOpen } from 'react-icons/fi';

export default function CategorySidebar({
  categories,
  activeCategory,
  onSelectCategory,
  onCategoryCreate,
  onCategoryUpdate,
  onCategoryDelete,
  isAdminOrManager,
  articleCounts,
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await onCategoryCreate({ name: newName.trim() });
    setNewName('');
    setShowCreate(false);
  };

  const handleUpdate = async (id) => {
    if (!editName.trim()) return;
    await onCategoryUpdate(id, { name: editName.trim() });
    setEditId(null);
    setEditName('');
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this category? Articles in this category will not be deleted.')) {
      await onCategoryDelete(id);
    }
  };

  const setAll = !activeCategory;

  return (
    <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm overflow-hidden">
      <div className="px-4 py-3.5 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FiFolder className="w-4 h-4 text-gray-400" />
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Categories</h3>
        </div>
        {isAdminOrManager && (
          <button onClick={() => setShowCreate(!showCreate)} className="p-1 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all">
            <FiPlus className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {showCreate && (
        <div className="px-4 py-2.5 border-b border-gray-100 bg-indigo-50/50 flex gap-1.5">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Category name"
            className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300"
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            autoFocus
          />
          <button onClick={handleCreate} className="p-1 rounded text-indigo-600 hover:bg-indigo-100"><FiCheck className="w-3.5 h-3.5" /></button>
          <button onClick={() => { setShowCreate(false); setNewName(''); }} className="p-1 rounded text-gray-400 hover:bg-gray-200"><FiX className="w-3.5 h-3.5" /></button>
        </div>
      )}

      <div className="p-2">
        <button
          onClick={() => onSelectCategory(null)}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all duration-200 ${
            setAll ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <FiBookOpen className={`w-4 h-4 shrink-0 ${setAll ? 'text-indigo-500' : 'text-gray-400'}`} />
          <span className="truncate">All Articles</span>
        </button>

        <div className="mt-1 space-y-0.5">
          {categories.length === 0 && !showCreate && (
            <p className="px-3 py-4 text-xs text-gray-400 text-center">No categories yet</p>
          )}
          {categories.map((cat) => {
            const isActive = activeCategory === cat.id;
            const count = articleCounts?.[cat.id] ?? cat.article_count ?? 0;
            return (
              <div key={cat.id} className="group">
                {editId === cat.id ? (
                  <div className="px-3 py-1.5 flex gap-1">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300"
                      onKeyDown={(e) => e.key === 'Enter' && handleUpdate(cat.id)}
                      autoFocus
                    />
                    <button onClick={() => handleUpdate(cat.id)} className="p-0.5 text-indigo-600 hover:bg-indigo-100 rounded"><FiCheck className="w-3 h-3" /></button>
                    <button onClick={() => { setEditId(null); setEditName(''); }} className="p-0.5 text-gray-400 hover:bg-gray-200 rounded"><FiX className="w-3 h-3" /></button>
                  </div>
                ) : (
                  <button
                    onClick={() => onSelectCategory(cat.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all duration-200 ${
                      isActive ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <FiFolder className={`w-4 h-4 shrink-0 ${isActive ? 'text-indigo-500' : 'text-gray-400'}`} />
                    <span className="truncate flex-1 text-left">{cat.name}</span>
                    <span className={`text-xs font-medium ${isActive ? 'text-indigo-400' : 'text-gray-400'}`}>{count}</span>
                    {isAdminOrManager && (
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditId(cat.id); setEditName(cat.name); }}
                          className="p-1 rounded text-gray-300 hover:text-indigo-500 hover:bg-indigo-50"
                        >
                          <FiEdit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(cat.id); }}
                          className="p-1 rounded text-gray-300 hover:text-red-500 hover:bg-red-50"
                        >
                          <FiTrash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
