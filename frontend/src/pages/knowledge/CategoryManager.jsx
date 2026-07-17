import { useState, useEffect } from 'react';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../../api/knowledgeBase';
import { FiPlus, FiEdit2, FiTrash2, FiFolder, FiCheck, FiX } from 'react-icons/fi';

export default function CategoryManager() {
  const [categories, setCategories] = useState([]);
  const [newName, setNewName] = useState('');
  const [editing, setEditing] = useState(null);
  const [editName, setEditName] = useState('');

  const load = async () => { try { const d = await getCategories(); setCategories(Array.isArray(d) ? d : []); } catch { setCategories([]); } };
  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await createCategory({ name: newName });
    setNewName('');
    load();
  };

  const handleUpdate = async (id) => {
    if (!editName.trim()) return;
    await updateCategory(id, { name: editName });
    setEditing(null);
    load();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this category?')) return;
    await deleteCategory(id);
    load();
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">Manage Categories</h3>
      <div className="flex items-center gap-2 mb-4">
        <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="New category name" className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30" onKeyDown={e => e.key === 'Enter' && handleCreate()} />
        <button onClick={handleCreate} className="p-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-all"><FiPlus className="w-4 h-4" /></button>
      </div>
      <div className="space-y-2">
        {categories.map(cat => (
          <div key={cat.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors group">
            {editing === cat.id ? (
              <div className="flex items-center gap-2 flex-1">
                <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30" onKeyDown={e => e.key === 'Enter' && handleUpdate(cat.id)} />
                <button onClick={() => handleUpdate(cat.id)} className="p-1.5 rounded-lg text-green-600 hover:bg-green-50"><FiCheck className="w-3.5 h-3.5" /></button>
                <button onClick={() => setEditing(null)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100"><FiX className="w-3.5 h-3.5" /></button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2"><FiFolder className="w-4 h-4 text-gray-400" /><span className="text-sm text-gray-700">{cat.name}</span><span className="text-xs text-gray-400">({cat.article_count || 0})</span></div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => { setEditing(cat.id); setEditName(cat.name); }} className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50"><FiEdit2 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleDelete(cat.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"><FiTrash2 className="w-3.5 h-3.5" /></button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
