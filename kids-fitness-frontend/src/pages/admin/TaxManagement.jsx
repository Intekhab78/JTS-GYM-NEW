import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../api/api.js';
import Navbar from '../../components/Navbar.jsx';
import Footer from '../../components/Footer.jsx';
import AdminHeader from '../../components/AdminHeader.jsx';
import { usePermissions } from '../../hooks/usePermissions.js';
import toast from 'react-hot-toast';

export default function TaxManagement() {
  const { roleSlug } = useParams();
  const { can } = usePermissions();
  const [taxes, setTaxes] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [editingTax, setEditingTax] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    value: 0,
    type: 'percentage',
    validityStart: '',
    validityEnd: '',
    locationId: '',
    status: 'active',
    calculationMethod: 'exclusive',
    description: ''
  });

  const canCreate = can('taxes:create') || true; // Fallback for dev
  const canEdit = can('taxes:edit') || true;
  const canDelete = can('taxes:delete') || true;

  const loadData = async () => {
    setLoading(true);
    try {
      const [taxesRes, locsRes] = await Promise.all([
        api.get('/taxes'),
        api.get('/locations')
      ]);
      setTaxes(taxesRes.data.data);
      setLocations(locsRes.data);
    } catch (err) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.locationId) return toast.error('Please select a location');
    
    try {
      if (editingTax) {
        await api.patch(`/taxes/${editingTax._id}`, formData);
        toast.success('Tax updated successfully');
      } else {
        await api.post('/taxes', formData);
        toast.success('Tax created successfully');
      }
      resetForm();
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save tax');
    }
  };

  const resetForm = () => {
    setEditingTax(null);
    setFormData({
      name: '',
      value: 0,
      type: 'percentage',
      validityStart: '',
      validityEnd: '',
      locationId: '',
      status: 'active',
      calculationMethod: 'exclusive',
      description: ''
    });
    setIsSidebarOpen(false);
  };

  const startEdit = (tax) => {
    setEditingTax(tax);
    setFormData({
      ...tax,
      locationId: tax.locationId?._id || tax.locationId,
      validityStart: tax.validityStart ? tax.validityStart.split('T')[0] : '',
      validityEnd: tax.validityEnd ? tax.validityEnd.split('T')[0] : ''
    });
    setIsSidebarOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this tax?')) return;
    try {
      await api.delete(`/taxes/${id}`);
      toast.success('Tax deleted');
      loadData();
    } catch (err) {
      toast.error('Failed to delete tax');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <Navbar />
      <main className="page-shell py-12">
        <AdminHeader 
          title="Tax Master" 
          description="Manage region-specific tax rules and VAT configurations."
          backTo={`/${roleSlug}`}
        />

        <div className="mt-8 flex justify-between items-center">
          <div className="flex gap-4">
            <div className="bg-white px-6 py-3 rounded-2xl border border-slate-100 shadow-sm">
               <p className="text-[10px] font-black text-ink/30 uppercase tracking-widest">Active Rules</p>
               <p className="text-2xl font-black text-brand-blue">{taxes.filter(t => t.status === 'active').length}</p>
            </div>
          </div>
          {canCreate && (
            <button 
              onClick={() => { resetForm(); setIsSidebarOpen(true); }}
              className="bg-brand-blue text-white px-8 py-4 rounded-2xl font-black shadow-glow hover:scale-105 active:scale-95 transition-all"
            >
              + Create Tax Rule
            </button>
          )}
        </div>

        {/* Taxes List */}
        <div className="mt-8 grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {taxes.map(tax => (
            <div key={tax._id} className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
               <div className="absolute top-0 right-0 p-6">
                  <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${tax.status === 'active' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-50 text-slate-400 border border-slate-200'}`}>
                    {tax.status}
                  </span>
               </div>

               <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center text-2xl shadow-inner">
                    🏛️
                  </div>
                  <div>
                    <h3 className="font-display text-xl font-bold text-ink">{tax.name}</h3>
                    <p className="text-xs font-black text-brand-blue uppercase tracking-widest">{tax.locationId?.name || 'All Locations'}</p>
                  </div>
               </div>

               <div className="space-y-4">
                  <div className="p-5 rounded-2xl bg-slate-50/50 border border-slate-50 flex justify-between items-center">
                    <div>
                      <p className="text-[10px] font-black text-ink/30 uppercase tracking-widest mb-1">Value</p>
                      <p className="text-2xl font-black text-ink">{tax.value}{tax.type === 'percentage' ? '%' : ' AED'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-ink/30 uppercase tracking-widest mb-1">Type & Method</p>
                      <p className="text-xs font-bold text-ink uppercase tracking-wider">
                        {tax.type} <span className="text-brand-blue/40 mx-1">•</span> {tax.calculationMethod || 'exclusive'}
                      </p>
                    </div>
                  </div>

                  {tax.validityStart && (
                    <div className="p-4 rounded-2xl bg-slate-50/50 border border-slate-50">
                       <p className="text-[10px] font-black text-ink/30 uppercase tracking-widest mb-1">Validity Range</p>
                       <p className="text-xs font-bold text-ink">
                         {new Date(tax.validityStart).toLocaleDateString()} — {tax.validityEnd ? new Date(tax.validityEnd).toLocaleDateString() : 'No Expiry'}
                       </p>
                    </div>
                  )}
               </div>

               <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                  {canEdit && (
                    <button onClick={() => startEdit(tax)} className="p-3 bg-slate-50 text-ink/40 hover:text-brand-blue hover:bg-brand-blue/5 rounded-xl transition-all">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    </button>
                  )}
                  {canDelete && (
                    <button onClick={() => handleDelete(tax._id)} className="p-3 bg-slate-50 text-ink/40 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  )}
               </div>
            </div>
          ))}
        </div>

        {/* Sidebar Form */}
        {isSidebarOpen && (
          <div className="fixed inset-0 z-[100] flex justify-end animate-fade-in">
            <div className="absolute inset-0 bg-ink/20 backdrop-blur-sm" onClick={resetForm}></div>
            <div className="relative w-full max-w-xl bg-white shadow-2xl h-screen overflow-y-auto custom-scrollbar animate-slide-left p-10">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="font-display text-3xl font-bold text-ink">
                    {editingTax ? 'Edit Tax Rule' : 'New Tax Rule'}
                  </h2>
                  <p className="text-xs font-black text-brand-blue uppercase tracking-widest mt-1">Configure VAT & Local Levies</p>
                </div>
                <button onClick={resetForm} className="w-12 h-12 rounded-2xl bg-slate-50 text-ink/40 flex items-center justify-center hover:bg-slate-100 transition-all text-xl">×</button>
              </div>

              <form onSubmit={handleSave} className="space-y-8 pb-20">
                <div className="grid gap-6">
                  <div>
                    <label className="text-[10px] font-black text-ink/30 uppercase tracking-[0.2em] block mb-3 px-1">Tax Name</label>
                    <input 
                      type="text" required
                      className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold text-ink focus:ring-2 focus:ring-brand-blue/20 outline-none"
                      placeholder="e.g. VAT (5%)"
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-ink/30 uppercase tracking-[0.2em] block mb-3 px-1">Value</label>
                      <input 
                        type="number" required
                        className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold text-ink focus:ring-2 focus:ring-brand-blue/20 outline-none"
                        value={formData.value}
                        onChange={e => setFormData({...formData, value: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-ink/30 uppercase tracking-[0.2em] block mb-3 px-1">Calculation</label>
                      <select 
                        className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold text-ink focus:ring-2 focus:ring-brand-blue/20 outline-none"
                        value={formData.calculationMethod}
                        onChange={e => setFormData({...formData, calculationMethod: e.target.value})}
                      >
                        <option value="exclusive">Exclusive (Price + Tax)</option>
                        <option value="inclusive">Inclusive (Price includes Tax)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-ink/30 uppercase tracking-[0.2em] block mb-3 px-1">Applicable Store</label>
                    <select 
                      required
                      className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold text-ink focus:ring-2 focus:ring-brand-blue/20 outline-none"
                      value={formData.locationId}
                      onChange={e => setFormData({...formData, locationId: e.target.value})}
                    >
                      <option value="">Select a Branch</option>
                      {locations.map(loc => (
                        <option key={loc._id} value={loc._id}>{loc.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-ink/30 uppercase tracking-[0.2em] block mb-3 px-1">Valid From</label>
                      <input 
                        type="date"
                        className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold text-ink focus:ring-2 focus:ring-brand-blue/20 outline-none"
                        value={formData.validityStart}
                        onChange={e => setFormData({...formData, validityStart: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-ink/30 uppercase tracking-[0.2em] block mb-3 px-1">Valid Until</label>
                      <input 
                        type="date"
                        className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold text-ink focus:ring-2 focus:ring-brand-blue/20 outline-none"
                        value={formData.validityEnd}
                        onChange={e => setFormData({...formData, validityEnd: e.target.value})}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-ink/30 uppercase tracking-[0.2em] block mb-3 px-1">Description</label>
                    <textarea 
                      className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold text-ink focus:ring-2 focus:ring-brand-blue/20 outline-none min-h-[100px]"
                      placeholder="Optional notes about this tax rule..."
                      value={formData.description}
                      onChange={e => setFormData({...formData, description: e.target.value})}
                    ></textarea>
                  </div>

                  <div className="flex items-center justify-between p-6 bg-slate-50/50 rounded-2xl border border-slate-50">
                    <div>
                      <p className="text-sm font-bold text-ink">Rule Status</p>
                      <p className="text-[10px] font-black text-ink/30 uppercase tracking-widest mt-1">Activate this rule for new transactions</p>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setFormData({...formData, status: formData.status === 'active' ? 'inactive' : 'active'})}
                      className={`w-14 h-8 rounded-full relative transition-all ${formData.status === 'active' ? 'bg-brand-blue' : 'bg-slate-200'}`}
                    >
                      <div className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow-sm transition-all ${formData.status === 'active' ? 'right-1' : 'left-1'}`}></div>
                    </button>
                  </div>
                </div>

                <div className="pt-8">
                   <button 
                     type="submit"
                     className="w-full bg-brand-blue text-white py-5 rounded-[24px] font-black text-lg shadow-glow hover:scale-[1.02] active:scale-95 transition-all"
                   >
                     {editingTax ? 'Update Tax Rule' : 'Save Tax Rule'}
                   </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
