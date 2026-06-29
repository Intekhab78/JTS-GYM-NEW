import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../api/api.js';
import Navbar from '../../components/Navbar.jsx';
import Footer from '../../components/Footer.jsx';
import AdminHeader from '../../components/AdminHeader.jsx';
import { usePermissions } from '../../hooks/usePermissions.js';
import toast from 'react-hot-toast';

const PROMO_TYPES = [
  { id: 'flash', label: 'Flash Sale', icon: '⚡' },
  { id: 'percentage', label: 'Percentage Discount', icon: '🏷️' },
  { id: 'cash', label: 'Cash Discount', icon: '💵' },
  { id: 'bogo', label: 'BOGO (Buy 1 Get 1)', icon: '🎁' },
  { id: 'bulk', label: 'Bulk Purchase', icon: '📦' },
  { id: 'lifestyle', label: 'Lifestyle Discount', icon: '🎓' },
  { id: 'tiered', label: 'Ticket Level (Tiered)', icon: '📈' },
  { id: 'cash_deposit', label: 'Cash Deposit Voucher', icon: '🎟️' }
];

export default function PromotionsManagement() {
  const { roleSlug } = useParams();
  const { can } = usePermissions();
  const [promotions, setPromotions] = useState([]);
  const [locations, setLocations] = useState([]);
  const [classes, setClasses] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    promoType: 'percentage',
    discountType: 'percentage',
    discountValue: 0,
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: '',
    buyQuantity: 1,
    getQuantity: 1,
    minQuantity: 1,
    minOrderValue: 0,
    targetGroups: [],
    applicableLocations: [],
    applicableClasses: [],
    applicablePlans: [],
    discountTiers: [{ minAmount: 1000, value: 5, type: 'percentage' }],
    isActive: true
  });

  const canCreate = can('promotions:create');
  const canEdit = can('promotions:edit');
  const canDelete = can('promotions:delete');

  const loadData = async () => {
    setLoading(true);
    try {
      const [promosRes, locsRes, classesRes, plansRes] = await Promise.all([
        api.get('/promotions'),
        api.get('/locations'),
        api.get('/classes'),
        api.get('/plans')
      ]);
      setPromotions(promosRes.data);
      setLocations(locsRes.data);
      setClasses(classesRes.data);
      setPlans(plansRes.data);
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
    try {
      if (editingPromo) {
        await api.put(`/promotions/${editingPromo._id}`, formData);
        toast.success('Promotion updated');
      } else {
        await api.post('/promotions', formData);
        toast.success('Promotion created');
      }
      resetForm();
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save promotion');
    }
  };

  const resetForm = () => {
    setEditingPromo(null);
    setFormData({
      name: '',
      description: '',
      promoType: 'percentage',
      discountType: 'percentage',
      discountValue: 0,
      startDate: '',
      endDate: '',
      startTime: '',
      endTime: '',
      buyQuantity: 1,
      getQuantity: 1,
      minQuantity: 1,
      minOrderValue: 0,
      targetGroups: [],
      applicableLocations: [],
      applicableClasses: [],
      applicablePlans: [],
      discountTiers: [{ minAmount: 1000, value: 5, type: 'percentage' }],
      isActive: true
    });
    setIsSidebarOpen(false);
  };

  const startEdit = (promo) => {
    setEditingPromo(promo);
    setFormData({
      ...promo,
      startDate: promo.startDate ? promo.startDate.split('T')[0] : '',
      endDate: promo.endDate ? promo.endDate.split('T')[0] : '',
      applicableLocations: promo.applicableLocations?.map(l => l._id || l) || [],
      applicableClasses: promo.applicableClasses?.map(c => c._id || c) || [],
      applicablePlans: promo.applicablePlans?.map(p => p._id || p) || []
    });
    setIsSidebarOpen(true);
  };

  const toggleStatus = async (id, currentStatus) => {
    try {
      await api.put(`/promotions/${id}`, { isActive: !currentStatus });
      toast.success(`Promotion ${!currentStatus ? 'activated' : 'deactivated'}`);
      loadData();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this promotion?')) return;
    try {
      await api.delete(`/promotions/${id}`);
      toast.success('Promotion deleted');
      loadData();
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  const toggleArrayItem = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter(i => i !== value)
        : [...prev[field], value]
    }));
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="page-shell py-12">
        <AdminHeader 
          title="Promotions & Discounts" 
          description="Design high-converting campaigns across your stores."
          backTo={`/${roleSlug}`}
        />

        <div className="mt-8 flex justify-between items-center">
          <div className="flex gap-4">
            <div className="bg-white px-6 py-3 rounded-2xl border border-slate-100 shadow-sm">
               <p className="text-[10px] font-black text-ink/30 uppercase tracking-widest">Active Campaigns</p>
               <p className="text-2xl font-black text-brand-blue">{promotions.filter(p => p.isActive).length}</p>
            </div>
          </div>
          {canCreate && (
            <button 
              onClick={() => { resetForm(); setIsSidebarOpen(true); }}
              className="bg-brand-blue text-white px-8 py-4 rounded-2xl font-black shadow-glow hover:scale-105 active:scale-95 transition-all"
            >
              + Create Promotion
            </button>
          )}
        </div>

        {/* Promotions List */}
        <div className="mt-8 grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {promotions.map(promo => (
            <div key={promo._id} className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6">
                <button 
                  onClick={() => toggleStatus(promo._id, promo.isActive)}
                  className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 ${promo.isActive ? 'bg-green-50 text-green-600 border border-green-200 shadow-sm' : 'bg-slate-50 text-slate-400 border border-slate-200'}`}
                >
                  {promo.isActive ? 'Active' : 'Inactive'}
                </button>
              </div>
              
              <div className="flex items-center gap-4 mb-6">
                 <div className="w-14 h-14 rounded-2xl bg-brand-blue/5 flex items-center justify-center text-2xl shadow-inner">
                    {PROMO_TYPES.find(t => t.id === promo.promoType)?.icon || '🎁'}
                 </div>
                 <div>
                    <h3 className="font-display text-xl font-bold text-ink">{promo.name}</h3>
                    <p className="text-xs font-black text-brand-blue uppercase tracking-widest">{PROMO_TYPES.find(t => t.id === promo.promoType)?.label}</p>
                 </div>
              </div>

              <div className="space-y-4">
                 <div className="p-4 rounded-2xl bg-slate-50/50 border border-slate-50">
                    <p className="text-[10px] font-black text-ink/30 uppercase tracking-widest mb-1">Validity</p>
                    <p className="text-xs font-bold text-ink">
                      {new Date(promo.startDate).toLocaleDateString()} — {new Date(promo.endDate).toLocaleDateString()}
                    </p>
                 </div>

                 <div className="flex gap-2 flex-wrap">
                    {promo.applicableLocations?.length > 0 && (
                      <span className="bg-ocean/5 text-ocean text-[9px] font-black px-2 py-1 rounded-lg border border-ocean/10">
                        {promo.applicableLocations.length} locations
                      </span>
                    )}
                    {promo.promoType === 'percentage' && (
                      <span className="bg-coral/5 text-coral text-[9px] font-black px-2 py-1 rounded-lg border border-coral/10">
                        {promo.discountValue}% OFF
                      </span>
                    )}
                    {promo.promoType === 'cash' && (
                      <span className="bg-emerald-50 text-emerald-600 text-[9px] font-black px-2 py-1 rounded-lg border border-emerald-100">
                        AED {promo.discountValue} OFF
                      </span>
                    )}
                    {promo.promoType === 'cash_deposit' && (
                      <span className="bg-amber-50 text-amber-600 text-[9px] font-black px-2 py-1 rounded-lg border border-amber-100">
                        🎟️ {promo.discountType === 'percentage' ? `${promo.discountValue}% Voucher` : `AED ${promo.discountValue} Voucher`}
                      </span>
                    )}
                 </div>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between">
                 <div className="flex -space-x-2">
                    <div className="w-8 h-8 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] font-black text-ink/40" title={`Created by ${promo.createdBy?.name || 'Unknown'}`}>
                      {promo.createdBy?.name?.charAt(0) || 'U'}
                    </div>
                 </div>
                 <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                    {canEdit && (
                      <button onClick={() => startEdit(promo)} className="p-2.5 bg-slate-50 text-ink/40 hover:text-brand-blue hover:bg-brand-blue/5 rounded-xl transition-all">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                      </button>
                    )}
                    {canDelete && (
                      <button onClick={() => handleDelete(promo._id)} className="p-2.5 bg-slate-50 text-ink/40 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    )}
                 </div>
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar Form */}
        {isSidebarOpen && (
          <div className="fixed inset-0 z-[100] flex justify-end animate-fade-in">
            <div className="absolute inset-0 bg-ink/20 backdrop-blur-sm" onClick={resetForm}></div>
            <div className="relative w-full max-w-2xl bg-white shadow-2xl h-screen overflow-y-auto custom-scrollbar animate-slide-left p-10">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="font-display text-3xl font-bold text-ink">
                    {editingPromo ? 'Edit Campaign' : 'New Campaign'}
                  </h2>
                  <p className="text-xs font-black text-brand-blue uppercase tracking-widest mt-1">Configure Promotion Parameters</p>
                </div>
                <button onClick={resetForm} className="w-12 h-12 rounded-2xl bg-slate-50 text-ink/40 flex items-center justify-center hover:bg-slate-100 transition-all text-xl">×</button>
              </div>

              <form onSubmit={handleSave} className="space-y-8 pb-20">
                <div className="grid gap-6">
                  <div>
                    <label className="text-[10px] font-black text-ink/30 uppercase tracking-[0.2em] block mb-3 px-1">Campaign Name</label>
                    <input 
                      type="text" required
                      className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold text-ink focus:ring-2 focus:ring-brand-blue/20 outline-none"
                      placeholder="e.g. Ramadan Special 2026"
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-ink/30 uppercase tracking-[0.2em] block mb-3 px-1">Promotion Type</label>
                    <div className="grid grid-cols-4 gap-2">
                       {PROMO_TYPES.map(type => (
                         <button
                           key={type.id} type="button"
                           onClick={() => setFormData({...formData, promoType: type.id})}
                           className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 transition-all ${formData.promoType === type.id ? 'border-brand-blue bg-brand-blue/5 text-brand-blue shadow-md' : 'border-slate-50 bg-white hover:border-slate-200 opacity-60 hover:opacity-100'}`}
                         >
                           <span className="text-lg">{type.icon}</span>
                           <span className="text-[8px] font-black uppercase text-center leading-tight">{type.label}</span>
                         </button>
                       ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                     <div>
                       <label className="text-[10px] font-black text-ink/30 uppercase tracking-[0.2em] block mb-3 px-1">Valid From</label>
                       <input 
                         type="date" required
                         className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold text-ink focus:ring-2 focus:ring-brand-blue/20 outline-none"
                         value={formData.startDate}
                         onChange={e => setFormData({...formData, startDate: e.target.value})}
                       />
                     </div>
                     <div>
                       <label className="text-[10px] font-black text-ink/30 uppercase tracking-[0.2em] block mb-3 px-1">Valid Until</label>
                       <input 
                         type="date" required
                         className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold text-ink focus:ring-2 focus:ring-brand-blue/20 outline-none"
                         value={formData.endDate}
                         onChange={e => setFormData({...formData, endDate: e.target.value})}
                       />
                     </div>
                  </div>

                  {formData.promoType === 'flash' && (
                    <div className="p-6 rounded-2xl bg-orange-50 border border-orange-100 animate-rise space-y-6">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">⚡</span>
                        <p className="text-[10px] font-black text-orange-700 uppercase tracking-[0.2em]">Flash Sale Configuration</p>
                      </div>

                      {/* Daily Time Window */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] font-black text-orange-700/60 uppercase tracking-[0.2em] block mb-2 px-1">Daily Start Time</label>
                          <input 
                            type="time" 
                            className="w-full bg-white border border-orange-100 rounded-2xl py-3 px-5 text-sm font-bold text-ink focus:ring-2 focus:ring-orange-200 outline-none"
                            value={formData.startTime}
                            onChange={e => setFormData({...formData, startTime: e.target.value})}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-orange-700/60 uppercase tracking-[0.2em] block mb-2 px-1">Daily End Time</label>
                          <input 
                            type="time" 
                            className="w-full bg-white border border-orange-100 rounded-2xl py-3 px-5 text-sm font-bold text-ink focus:ring-2 focus:ring-orange-200 outline-none"
                            value={formData.endTime}
                            onChange={e => setFormData({...formData, endTime: e.target.value})}
                          />
                        </div>
                      </div>

                      {/* Discount Settings */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] font-black text-orange-700/60 uppercase tracking-[0.2em] block mb-2 px-1">Discount Mode</label>
                          <select 
                            className="w-full bg-white border border-orange-100 rounded-2xl py-3 px-5 text-sm font-bold text-ink focus:ring-2 focus:ring-orange-200 outline-none"
                            value={formData.discountType}
                            onChange={e => setFormData({...formData, discountType: e.target.value})}
                          >
                            <option value="percentage">Percentage (%)</option>
                            <option value="flat">Fixed Amount (AED)</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-orange-700/60 uppercase tracking-[0.2em] block mb-2 px-1">
                            Discount Value ({formData.discountType === 'percentage' ? '%' : 'AED'})
                          </label>
                          <input 
                            type="number" required min="0"
                            className="w-full bg-white border border-orange-100 rounded-2xl py-3 px-5 text-sm font-bold text-ink focus:ring-2 focus:ring-orange-200 outline-none"
                            placeholder={formData.discountType === 'percentage' ? 'e.g. 20' : 'e.g. 50'}
                            value={formData.discountValue}
                            onChange={e => setFormData({...formData, discountValue: e.target.value})}
                          />
                        </div>
                      </div>

                      <p className="text-[10px] font-medium text-orange-600/70 leading-relaxed">
                        ⚡ This discount applies <strong>only during the daily time window</strong> above, within the campaign date range.
                      </p>
                    </div>
                  )}

                  {(formData.promoType === 'percentage' || formData.promoType === 'cash' || formData.promoType === 'bulk' || formData.promoType === 'lifestyle' || formData.promoType === 'cash_deposit') && (
                    <div className="grid md:grid-cols-2 gap-6 animate-rise">
                       <div>
                          <label className="text-[10px] font-black text-ink/30 uppercase tracking-[0.2em] block mb-3 px-1">Discount Mode</label>
                          <select 
                            className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold text-ink focus:ring-2 focus:ring-brand-blue/20 outline-none"
                            value={formData.discountType}
                            onChange={e => setFormData({...formData, discountType: e.target.value})}
                          >
                             <option value="percentage">Percentage (%)</option>
                             <option value="flat">Fixed Amount (AED)</option>
                          </select>
                       </div>
                       <div>
                          <label className="text-[10px] font-black text-ink/30 uppercase tracking-[0.2em] block mb-3 px-1">Value ({formData.discountType === 'percentage' ? '%' : 'AED'})</label>
                          <input 
                            type="number" required
                            className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold text-ink focus:ring-2 focus:ring-brand-blue/20 outline-none"
                            value={formData.discountValue}
                            onChange={e => setFormData({...formData, discountValue: e.target.value})}
                          />
                       </div>
                    </div>
                  )}

                  {formData.promoType === 'cash_deposit' && (
                    <div className="p-5 rounded-2xl bg-amber-50 border border-amber-100 animate-rise">
                      <p className="text-[10px] font-black text-amber-700 uppercase tracking-[0.2em] mb-2">🎟️ How Cash Deposit Works</p>
                      <p className="text-xs font-medium text-amber-700/80 leading-relaxed">
                        The customer pays <strong>100% of the booking price upfront</strong>. 
                        Upon completing payment, the system automatically generates a cash voucher worth the discount value above, 
                        which the customer can redeem on their next booking. Valid for <strong>90 days</strong>.
                      </p>
                    </div>
                  )}

                  {formData.promoType === 'tiered' && (
                    <div className="space-y-4 animate-rise">
                       <label className="text-[10px] font-black text-ink/30 uppercase tracking-[0.2em] block mb-1 px-1">Discount Tiers</label>
                       {formData.discountTiers.map((tier, idx) => (
                         <div key={idx} className="flex items-center gap-3 p-4 rounded-2xl bg-white border border-slate-100 shadow-sm relative group">
                            <div className="flex-1">
                               <p className="text-[10px] font-black text-ink/20 uppercase mb-1">Min. Amount</p>
                               <input 
                                 type="number" 
                                 className="w-full bg-slate-50 border-none rounded-xl py-2 px-3 text-sm font-bold"
                                 value={tier.minAmount}
                                 onChange={e => {
                                   const newTiers = [...formData.discountTiers];
                                   newTiers[idx].minAmount = e.target.value;
                                   setFormData({...formData, discountTiers: newTiers});
                                 }}
                               />
                            </div>
                            <div className="flex-1">
                               <p className="text-[10px] font-black text-ink/20 uppercase mb-1">Discount</p>
                               <input 
                                 type="number" 
                                 className="w-full bg-slate-50 border-none rounded-xl py-2 px-3 text-sm font-bold"
                                 value={tier.value}
                                 onChange={e => {
                                   const newTiers = [...formData.discountTiers];
                                   newTiers[idx].value = e.target.value;
                                   setFormData({...formData, discountTiers: newTiers});
                                 }}
                               />
                            </div>
                            <div className="flex-1">
                               <p className="text-[10px] font-black text-ink/20 uppercase mb-1">Type</p>
                               <select 
                                 className="w-full bg-slate-50 border-none rounded-xl py-2 px-3 text-sm font-bold"
                                 value={tier.type}
                                 onChange={e => {
                                   const newTiers = [...formData.discountTiers];
                                   newTiers[idx].type = e.target.value;
                                   setFormData({...formData, discountTiers: newTiers});
                                 }}
                               >
                                  <option value="percentage">%</option>
                                  <option value="flat">AED</option>
                               </select>
                            </div>
                            <button 
                              type="button"
                              onClick={() => setFormData({...formData, discountTiers: formData.discountTiers.filter((_, i) => i !== idx)})}
                              className="w-8 h-8 rounded-full bg-red-50 text-red-400 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                            >×</button>
                         </div>
                       ))}
                       <button 
                         type="button"
                         onClick={() => setFormData({...formData, discountTiers: [...formData.discountTiers, { minAmount: 0, value: 0, type: 'percentage' }]})}
                         className="w-full py-3 rounded-2xl border-2 border-dashed border-slate-100 text-[10px] font-black text-ink/30 hover:border-brand-blue/30 hover:text-brand-blue transition-all uppercase tracking-widest"
                       >+ Add Tier</button>
                    </div>
                  )}

                  <hr className="border-slate-50 my-4" />

                  {/* Targeting */}
                  <div>
                    <label className="text-[10px] font-black text-ink/30 uppercase tracking-[0.2em] block mb-4 px-1">Applicable Branches</label>
                    <div className="flex flex-wrap gap-2">
                       {locations.map(loc => (
                         <button
                           key={loc._id} type="button"
                           onClick={() => toggleArrayItem('applicableLocations', loc._id)}
                           className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${formData.applicableLocations.includes(loc._id) ? 'bg-brand-blue text-white shadow-md' : 'bg-white text-ink/40 border-slate-100 hover:border-brand-blue/20'}`}
                         >
                           {loc.name}
                         </button>
                       ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-ink/30 uppercase tracking-[0.2em] block mb-4 px-1">Target Items (Leave empty for all)</label>
                    <div className="space-y-6">
                       <div>
                          <p className="text-[10px] font-black text-ocean/40 uppercase mb-3">Classes</p>
                          <div className="flex flex-wrap gap-2 max-h-[150px] overflow-y-auto custom-scrollbar p-1">
                             {classes.map(c => (
                               <button
                                 key={c._id} type="button"
                                 onClick={() => toggleArrayItem('applicableClasses', c._id)}
                                 className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all border ${formData.applicableClasses.includes(c._id) ? 'bg-ocean text-white shadow-md' : 'bg-white text-ink/40 border-slate-100'}`}
                               >
                                 {c.title}
                               </button>
                             ))}
                          </div>
                       </div>
                       <div>
                          <p className="text-[10px] font-black text-indigo-400 uppercase mb-3">Membership Plans</p>
                          <div className="flex flex-wrap gap-2 max-h-[150px] overflow-y-auto custom-scrollbar p-1">
                             {plans.map(p => (
                               <button
                                 key={p._id} type="button"
                                 onClick={() => toggleArrayItem('applicablePlans', p._id)}
                                 className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all border ${formData.applicablePlans.includes(p._id) ? 'bg-indigo-500 text-white shadow-md' : 'bg-white text-ink/40 border-slate-100'}`}
                               >
                                 {p.name}
                               </button>
                             ))}
                          </div>
                       </div>
                    </div>
                  </div>

                  <hr className="border-slate-50 my-4" />

                  <div className="flex items-center justify-between p-6 bg-slate-50/50 rounded-2xl border border-slate-50">
                    <div>
                      <p className="text-sm font-bold text-ink">Promotion Status</p>
                      <p className="text-[10px] font-black text-ink/30 uppercase tracking-widest mt-1">Make this campaign live immediately</p>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setFormData({...formData, isActive: !formData.isActive})}
                      className={`w-14 h-8 rounded-full relative transition-all ${formData.isActive ? 'bg-brand-blue' : 'bg-slate-200'}`}
                    >
                      <div className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow-sm transition-all ${formData.isActive ? 'right-1' : 'left-1'}`}></div>
                    </button>
                  </div>
                </div>

                <div className="pt-8">
                   <button 
                     type="submit"
                     className="w-full bg-brand-blue text-white py-5 rounded-[24px] font-black text-lg shadow-glow hover:scale-[1.02] active:scale-95 transition-all"
                   >
                     {editingPromo ? 'Update Campaign' : 'Launch Campaign'}
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
