import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Navbar from '../../components/Navbar.jsx';
import AdminHeader from '../../components/AdminHeader.jsx';
import Footer from '../../components/Footer.jsx';
import api from '../../api/api.js';
import { usePermissions } from '../../hooks/usePermissions.js';
import toast from 'react-hot-toast';
import { getImageUrl } from '../../api/api.js';
import { useSettings } from '../../context/SettingsContext.jsx';

export default function ExpensesManagement() {
  const { roleSlug } = useParams();
  const [expenses, setExpenses] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const { currency } = useSettings();
  
  // Filters
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterLocation, setFilterLocation] = useState('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [uploading, setUploading] = useState(false);
  
  const initialForm = {
    title: '',
    category: 'Other',
    amount: '',
    currency: currency,
    date: new Date().toISOString().split('T')[0],
    locationId: '',
    description: '',
    receiptUrl: ''
  };
  const [formData, setFormData] = useState(initialForm);

  const { can } = usePermissions();
  const canCreate = can('expenses:create');
  const canEdit = can('expenses:edit');
  const canDelete = can('expenses:delete');

  const categories = ['Salary', 'Equipment', 'Maintenance', 'Utilities', 'Marketing', 'Other'];

  const fetchLocations = async () => {
    try {
      const res = await api.get('/locations');
      setLocations(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      let url = `/expenses?locationId=${filterLocation}&category=${filterCategory}`;
      if (dateRange.start && dateRange.end) {
        url += `&startDate=${dateRange.start}&endDate=${dateRange.end}`;
      }
      const res = await api.get(url);
      setExpenses(res.data);
    } catch (error) {
      toast.error('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  useEffect(() => {
    fetchExpenses();
  }, [filterCategory, filterLocation, dateRange]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const uploadData = new FormData();
    uploadData.append('image', file);
    setUploading(true);

    try {
      const res = await api.post('/upload', uploadData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setFormData(prev => ({ ...prev, receiptUrl: res.data.image }));
      toast.success('Receipt uploaded successfully');
    } catch (err) {
      toast.error('File upload failed');
    } finally {
      setUploading(false);
    }
  };

  const openModal = (expense = null) => {
    if (expense) {
      setEditingExpense(expense);
      setFormData({
        title: expense.title,
        category: expense.category,
        amount: expense.amount,
        currency: expense.currency || currency,
        date: expense.date ? new Date(expense.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        locationId: expense.locationId?._id || '',
        description: expense.description || '',
        receiptUrl: expense.receiptUrl || ''
      });
    } else {
      setEditingExpense(null);
      setFormData(initialForm);
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formData, locationId: formData.locationId || undefined };
      if (editingExpense) {
        await api.put(`/expenses/${editingExpense._id}`, payload);
        toast.success('Expense updated successfully');
      } else {
        await api.post('/expenses', payload);
        toast.success('Expense created successfully');
      }
      setIsModalOpen(false);
      fetchExpenses();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Action failed');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this expense?')) return;
    try {
      await api.delete(`/expenses/${id}`);
      toast.success('Expense deleted');
      fetchExpenses();
    } catch (error) {
      toast.error('Failed to delete expense');
    }
  };

  const totalAmount = expenses.reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="page-shell py-12">
        <AdminHeader 
          title="Expense Management" 
          description="Track and manage operational expenses across your branches."
          backTo={`/${roleSlug}`}
        />

        {/* Dashboard Cards */}
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-[32px] bg-white p-8 shadow-sm border border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-ink/40 uppercase tracking-widest mb-1">Total Expenses</p>
              <p className="text-3xl font-black text-ink">{totalAmount.toLocaleString()} {currency}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-coral/10 text-coral flex items-center justify-center text-xl">
              💰
            </div>
          </div>
          <div className="rounded-[32px] bg-white p-8 shadow-sm border border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-ink/40 uppercase tracking-widest mb-1">Total Records</p>
              <p className="text-3xl font-black text-ink">{expenses.length}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-ocean/10 text-ocean flex items-center justify-center text-xl">
              📋
            </div>
          </div>
          {canCreate && (
            <button 
              onClick={() => openModal()}
              className="rounded-[32px] bg-ocean p-8 shadow-lg hover:-translate-y-1 transition-transform flex items-center justify-center gap-3 text-white font-black text-xl"
            >
              <span className="text-3xl">+</span> Add Expense
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="mt-8 rounded-[32px] bg-white p-6 shadow-sm border border-slate-100 flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px]">
            <label className="text-[10px] font-black text-ink/40 uppercase tracking-widest mb-2 block">Category</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full bg-slate-50 border-none rounded-2xl py-3 px-4 text-sm font-bold text-ink focus:ring-2 focus:ring-ocean/10"
            >
              <option value="all">All Categories</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="text-[10px] font-black text-ink/40 uppercase tracking-widest mb-2 block">Branch</label>
            <select
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value)}
              className="w-full bg-slate-50 border-none rounded-2xl py-3 px-4 text-sm font-bold text-ink focus:ring-2 focus:ring-ocean/10"
            >
              <option value="all">All Branches (Including Corporate)</option>
              {locations.map(loc => <option key={loc._id} value={loc._id}>{loc.name}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[200px] flex gap-2">
            <div className="flex-1">
              <label className="text-[10px] font-black text-ink/40 uppercase tracking-widest mb-2 block">Start Date</label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(p => ({ ...p, start: e.target.value }))}
                className="w-full bg-slate-50 border-none rounded-2xl py-3 px-4 text-sm font-bold text-ink focus:ring-2 focus:ring-ocean/10"
              />
            </div>
            <div className="flex-1">
              <label className="text-[10px] font-black text-ink/40 uppercase tracking-widest mb-2 block">End Date</label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(p => ({ ...p, end: e.target.value }))}
                className="w-full bg-slate-50 border-none rounded-2xl py-3 px-4 text-sm font-bold text-ink focus:ring-2 focus:ring-ocean/10"
              />
            </div>
          </div>
          <div className="pt-6">
             <button 
                onClick={() => { setFilterCategory('all'); setFilterLocation('all'); setDateRange({start: '', end: ''}); }}
                className="h-11 px-6 rounded-2xl bg-slate-100 text-ink/60 font-bold text-xs hover:bg-slate-200 transition-colors"
             >
               Reset Filters
             </button>
          </div>
        </div>

        {/* Expenses Table */}
        <div className="mt-8 rounded-[32px] bg-white shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-ink/40 font-black uppercase tracking-widest text-[10px]">
                <tr>
                  <th className="p-6">Date</th>
                  <th className="p-6">Title / Category</th>
                  <th className="p-6">Branch</th>
                  <th className="p-6 text-right">Amount ({currency})</th>
                  <th className="p-6 text-center">Receipt</th>
                  <th className="p-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr><td colSpan="6" className="p-8 text-center"><div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-ocean border-t-transparent" /></td></tr>
                ) : expenses.length === 0 ? (
                  <tr><td colSpan="6" className="p-8 text-center text-ink/40 italic">No expenses found matching the criteria.</td></tr>
                ) : expenses.map(expense => (
                  <tr key={expense._id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="p-6 font-bold text-ink whitespace-nowrap">
                      {new Date(expense.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="p-6">
                      <p className="font-bold text-ink">{expense.title}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded-lg bg-slate-100 text-[10px] font-black uppercase tracking-widest text-ink/60">
                        {expense.category}
                      </span>
                    </td>
                    <td className="p-6 text-ink/70 font-semibold">
                      {expense.locationId ? expense.locationId.name : <span className="italic text-ink/40">Corporate (All Branches)</span>}
                    </td>
                    <td className="p-6 text-right font-black text-ink">
                      {expense.amount.toLocaleString()}
                    </td>
                    <td className="p-6 text-center">
                      {expense.receiptUrl ? (
                        <a href={getImageUrl(expense.receiptUrl)} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-ocean/10 text-ocean hover:bg-ocean hover:text-white transition-colors" title="View Receipt">
                          📄
                        </a>
                      ) : (
                        <span className="text-ink/20">-</span>
                      )}
                    </td>
                    <td className="p-6 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {canEdit && (
                          <button onClick={() => openModal(expense)} className="p-2 rounded-xl bg-amber-50 text-amber-500 hover:bg-amber-500 hover:text-white transition-colors" title="Edit Expense">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </button>
                        )}
                        {canDelete && (
                          <button onClick={() => handleDelete(expense._id)} className="p-2 rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-colors" title="Delete Expense">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </main>
      <Footer />

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-2xl font-display font-bold text-ink">
                {editingExpense ? 'Edit Expense' : 'Add New Expense'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-full bg-white text-ink/40 hover:bg-slate-200 transition-colors shadow-sm">
                ✕
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 overflow-y-auto custom-scrollbar flex-1">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="text-[10px] font-black text-ink/40 uppercase tracking-widest mb-2 block">Expense Title *</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData(p => ({ ...p, title: e.target.value }))}
                    className="w-full bg-slate-50 border-none rounded-2xl py-4 px-5 text-sm font-bold text-ink focus:ring-2 focus:ring-ocean/20"
                    placeholder="e.g. November Staff Salaries"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-ink/40 uppercase tracking-widest mb-2 block">Category *</label>
                  <select
                    required
                    value={formData.category}
                    onChange={(e) => setFormData(p => ({ ...p, category: e.target.value }))}
                    className="w-full bg-slate-50 border-none rounded-2xl py-4 px-5 text-sm font-bold text-ink focus:ring-2 focus:ring-ocean/20"
                  >
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black text-ink/40 uppercase tracking-widest mb-2 block">Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData(p => ({ ...p, date: e.target.value }))}
                    className="w-full bg-slate-50 border-none rounded-2xl py-4 px-5 text-sm font-bold text-ink focus:ring-2 focus:ring-ocean/20"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-ink/40 uppercase tracking-widest mb-2 block">Amount ({currency}) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData(p => ({ ...p, amount: e.target.value }))}
                    className="w-full bg-slate-50 border-none rounded-2xl py-4 px-5 text-sm font-bold text-ink focus:ring-2 focus:ring-ocean/20"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-ink/40 uppercase tracking-widest mb-2 block">Branch Location</label>
                  <select
                    value={formData.locationId}
                    onChange={(e) => setFormData(p => ({ ...p, locationId: e.target.value }))}
                    className="w-full bg-slate-50 border-none rounded-2xl py-4 px-5 text-sm font-bold text-ink focus:ring-2 focus:ring-ocean/20"
                  >
                    <option value="">Corporate (Not branch specific)</option>
                    {locations.map(loc => <option key={loc._id} value={loc._id}>{loc.name}</option>)}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="text-[10px] font-black text-ink/40 uppercase tracking-widest mb-2 block">Receipt / Invoice Document</label>
                  <div className="flex items-center gap-4">
                    <label className={`flex-1 flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-[24px] cursor-pointer transition-colors ${formData.receiptUrl ? 'border-ocean bg-ocean/5' : 'border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300'}`}>
                      <span className="text-2xl mb-2">{uploading ? '⏳' : formData.receiptUrl ? '✅' : '📸'}</span>
                      <span className="text-xs font-bold text-ink/60 text-center">
                        {uploading ? 'Uploading...' : formData.receiptUrl ? 'Receipt attached. Click to replace.' : 'Click to upload receipt document (Image or PDF)'}
                      </span>
                      <input type="file" accept="image/*,application/pdf" onChange={handleFileUpload} className="hidden" />
                    </label>
                    {formData.receiptUrl && (
                      <div className="w-24 h-24 rounded-[20px] overflow-hidden border-2 border-slate-100 shadow-sm relative group flex items-center justify-center bg-slate-100">
                        {formData.receiptUrl.toLowerCase().endsWith('.pdf') ? (
                          <span className="text-4xl">📄</span>
                        ) : (
                          <img src={getImageUrl(formData.receiptUrl)} alt="Receipt" className="w-full h-full object-cover" />
                        )}
                        <a href={getImageUrl(formData.receiptUrl)} target="_blank" rel="noreferrer" className="absolute inset-0 bg-ink/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-bold">
                          View
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="text-[10px] font-black text-ink/40 uppercase tracking-widest mb-2 block">Additional Description</label>
                  <textarea
                    rows="3"
                    value={formData.description}
                    onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
                    className="w-full bg-slate-50 border-none rounded-2xl py-4 px-5 text-sm font-bold text-ink focus:ring-2 focus:ring-ocean/20 resize-none custom-scrollbar"
                    placeholder="Any extra details about this expense..."
                  />
                </div>
              </div>

              <div className="mt-10 flex gap-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 rounded-full bg-slate-100 py-4 text-sm font-bold text-ink/60 hover:bg-slate-200 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={uploading} className="flex-1 rounded-full bg-ocean py-4 text-sm font-black text-white hover:-translate-y-1 hover:shadow-lg transition-all active:scale-95 disabled:opacity-50">
                  {editingExpense ? 'Save Changes' : 'Create Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
