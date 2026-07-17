import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getForm, getSubmissions } from '../../api/customForms';
import { FiArrowLeft, FiDownload } from 'react-icons/fi';

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function FormSubmissions() {
  const { id } = useParams();
  const [form, setForm] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getForm(id), getSubmissions(id, { page: 1, size: 100 })]).then(([f, s]) => {
      setForm(f);
      setSubmissions(s.items || []);
    }).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="max-w-7xl mx-auto px-4 py-8"><div className="animate-pulse bg-gray-200 rounded-2xl h-96" /></div>;
  if (!form) return null;

  const fields = (form.fields_config || []).sort((a, b) => (a.order || 0) - (b.order || 0));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to="/custom-forms" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-indigo-600 mb-6 transition-colors"><FiArrowLeft className="w-4 h-4" />Back to Forms</Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{form.title} — Submissions</h1>
          <p className="text-sm text-gray-500 mt-1">{submissions.length} total submissions</p>
        </div>
      </div>

      {submissions.length === 0 ? (
        <div className="text-center py-16 bg-white/50 rounded-2xl border border-gray-200/50"><p className="text-gray-500 font-semibold">No submissions yet</p></div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200/60">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">#</th>
                  {fields.map((f, i) => <th key={i} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{f.label || `Field ${i + 1}`}</th>)}
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Submitted At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {submissions.map((sub, idx) => (
                  <tr key={sub.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-500">{idx + 1}</td>
                    {fields.map((f, i) => (
                      <td key={i} className="px-4 py-3 text-sm text-gray-700 max-w-[200px] truncate">
                        {f.type === 'checkbox' ? (sub.data?.[f.order || 0] ? 'Yes' : 'No') : String(sub.data?.[f.order || 0] || '-')}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-sm text-gray-500">{formatDate(sub.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
