import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useParams } from 'react-router-dom';
import api from '../../api/api.js';
import Navbar from '../../components/Navbar.jsx';
import Footer from '../../components/Footer.jsx';
import AdminHeader from '../../components/AdminHeader.jsx';

export default function CategoryManagement() {
  const { roleSlug } = useParams();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);

  const [form, setForm] = useState({
    name: '',
    description: '',
    type: 'both',
    status: 'active'
  });

  const fetchCategories = () => {
    setLoading(true);
    api.get('/categories')
      .then(res => {
        setCategories(res.data);
        setLoading(false);
      })
      .catch(err => {
        toast.error('Failed to load categories');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const resetForm = () => {
    setForm({
      name: '',
      description: '',
      type: 'both',
      status: 'active'
    });
    setEditingCategory(null);
  };

  const handleEdit = (cat) => {
    setForm({
      name: cat.name,
      description: cat.description || '',
      type: cat.type,
      status: cat.status
    });
    setEditingCategory(cat);
    setIsSidebarOpen(true);
  };

  const handleDelete = (id) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return;
    api.delete(`/categories/${id}`)
      .then(() => {
        toast.success('Category deleted successfully');
        fetchCategories();
      })
      .catch(err => toast.error(err.response?.data?.message || 'Failed to delete category'));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name) return toast.error('Category name is required');

    const request = editingCategory
      ? api.put(`/categories/${editingCategory._id}`, form)
      : api.post('/categories', form);

    request
      .then(() => {
        toast.success(editingCategory ? 'Category updated' : 'Category created');
        setIsSidebarOpen(false);
        fetchCategories();
      })
      .catch(err => toast.error(err.response?.data?.message || 'Failed to save category'));
  };

  return (
    <div>
      <Navbar />
      <main className="page-shell py-12">
        <AdminHeader 
          title="Category Master" 
          description="Manage categories for classes and memberships."
          backTo={`/${roleSlug}`}
        />
        
        <div className="flex justify-end mb-8 mt-4">
          <button
            onClick={() => { resetForm(); setIsSidebarOpen(true); }}
            className="bg-brand-blue text-white px-6 py-3 rounded-2xl font-bold shadow-low hover:-translate-y-1 hover:shadow-md transition-all active:scale-95"
          >
            + Add Category
          </button>
        </div>

        <div className="soft-card rounded-[32px] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="p-4 pl-6 text-xs font-black uppercase tracking-widest text-ink/40">Category Name</th>
                <th className="p-4 text-xs font-black uppercase tracking-widest text-ink/40">Description</th>
                <th className="p-4 text-xs font-black uppercase tracking-widest text-ink/40">Type</th>
                <th className="p-4 text-xs font-black uppercase tracking-widest text-ink/40">Status</th>
                <th className="p-4 pr-6 text-xs font-black uppercase tracking-widest text-ink/40 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-ink/40 font-bold animate-pulse">Loading categories...</td>
                </tr>
              ) : categories.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-ink/40 font-bold">No categories found. Create one to get started!</td>
                </tr>
              ) : (
                categories.map((cat) => (
                  <tr key={cat._id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors group">
                    <td className="p-4 pl-6">
                      <p className="font-bold text-ink">{cat.name}</p>
                    </td>
                    <td className="p-4">
                      <p className="text-sm text-ink/60 line-clamp-1">{cat.description || '—'}</p>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest ${
                        cat.type === 'class' ? 'bg-indigo-100 text-indigo-700' :
                        cat.type === 'membership' ? 'bg-emerald-100 text-emerald-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {cat.type}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${cat.status === 'active' ? 'bg-moss/10 text-moss' : 'bg-slate-100 text-ink/40'}`}>
                        {cat.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="p-4 pr-6 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEdit(cat)} className="p-2 text-ink/40 hover:text-brand-blue bg-white rounded-xl shadow-sm border border-slate-100 transition-all hover:-translate-y-0.5">
                          ✏️
                        </button>
                        <button onClick={() => handleDelete(cat._id)} className="p-2 text-ink/40 hover:text-coral bg-white rounded-xl shadow-sm border border-slate-100 transition-all hover:-translate-y-0.5">
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sidebar Form */}
      {isSidebarOpen && (
        <>
          <div className="fixed inset-0 bg-ink/20 backdrop-blur-sm z-40" onClick={() => setIsSidebarOpen(false)} />
          <div className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col animate-slide-left">
            <div className="p-6 md:p-8 flex items-center justify-between border-b border-slate-100 bg-slate-50/50">
              <h2 className="font-display text-2xl font-black text-ink">{editingCategory ? 'Edit Category' : 'New Category'}</h2>
              <button onClick={() => setIsSidebarOpen(false)} className="p-2 text-ink/40 hover:text-coral transition-colors rounded-xl hover:bg-white">
                ✕
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 md:p-8">
              <form id="categoryForm" onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-ink/40 uppercase tracking-widest mb-2">Category Name <span className="text-coral">*</span></label>
                  <input
                    type="text"
                    required
                    className="w-full bg-slate-50 border-none rounded-2xl py-3.5 px-5 text-sm font-bold text-ink focus:ring-2 focus:ring-brand-blue/20 outline-none transition-all"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink/40 uppercase tracking-widest mb-2">Description</label>
                  <textarea
                    rows={3}
                    className="w-full bg-slate-50 border-none rounded-2xl py-3.5 px-5 text-sm font-bold text-ink focus:ring-2 focus:ring-brand-blue/20 outline-none transition-all resize-none"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink/40 uppercase tracking-widest mb-2">Available For</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['both', 'class', 'membership'].map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setForm({ ...form, type: t })}
                        className={`py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all border-2 ${form.type === t ? 'border-brand-blue bg-brand-blue/5 text-brand-blue shadow-sm' : 'border-slate-100 bg-white text-ink/40 hover:border-brand-blue/30 hover:text-ink/70'}`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink/40 uppercase tracking-widest mb-2">Status</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="status" 
                        value="active" 
                        checked={form.status === 'active'} 
                        onChange={(e) => setForm({ ...form, status: e.target.value })} 
                        className="accent-brand-blue w-4 h-4"
                      />
                      <span className="text-sm font-bold text-ink">Active</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="status" 
                        value="inactive" 
                        checked={form.status === 'inactive'} 
                        onChange={(e) => setForm({ ...form, status: e.target.value })}
                        className="accent-brand-blue w-4 h-4"
                      />
                      <span className="text-sm font-bold text-ink/60">Inactive</span>
                    </label>
                  </div>
                </div>
              </form>
            </div>

            <div className="p-6 md:p-8 border-t border-slate-100 bg-slate-50/50 flex gap-4">
              <button
                type="button"
                onClick={() => setIsSidebarOpen(false)}
                className="flex-1 px-6 py-3.5 rounded-2xl font-bold text-ink/60 bg-white border-2 border-slate-200 hover:border-slate-300 hover:text-ink transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="categoryForm"
                className="flex-1 px-6 py-3.5 rounded-2xl font-bold text-white bg-brand-blue hover:bg-brand-blue/90 shadow-glow hover:shadow-glow-lg transition-all hover:-translate-y-0.5 active:scale-95"
              >
                {editingCategory ? 'Update' : 'Save'}
              </button>
            </div>
          </div>
        </>
      )}
      </main>
      <Footer />
    </div>
  );
}
