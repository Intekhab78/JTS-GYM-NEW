import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/api.js';
import Navbar from '../../components/Navbar.jsx';
import Footer from '../../components/Footer.jsx';
import AdminHeader from '../../components/AdminHeader.jsx';
import { usePermissions } from '../../hooks/usePermissions.js';
import toast from 'react-hot-toast';

export default function VoucherManagement() {
  const { roleSlug } = useParams();
  const navigate = useNavigate();
  const { can } = usePermissions();
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [viewingBatch, setViewingBatch] = useState(null);
  
  // Pagination State (Main Table)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Pagination State (Modal Popup)
  const [modalPage, setModalPage] = useState(1);
  const modalItemsPerPage = 10;

  const [formData, setFormData] = useState({
    code: '',
    amount: '',
    expiryDate: '',
    type: 'gift',
    description: '',
    count: 1
  });

  const canManage = can('settings:view');

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/coupons');
      setCoupons(res.data);
    } catch (err) {
      toast.error('Failed to load vouchers');
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
      const res = await api.post('/coupons', formData);
      toast.success(formData.count > 1 ? `${formData.count} vouchers generated` : 'Voucher created');
      
      if (formData.count > 1 && res.data && res.data.length > 0) {
        setViewingBatch({
          type: 'batch',
          id: res.data[0].batchId,
          name: res.data[0].batchName || formData.description || 'New Batch',
          items: res.data,
          amount: res.data[0].amount,
          expiryDate: res.data[0].expiryDate,
          status: 'active'
        });
        setModalPage(1); // Reset modal page for the new batch
      }

      resetForm();
      setCurrentPage(1); 
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save voucher');
    }
  };

  const handleViewBatch = (group) => {
    setViewingBatch(group);
    setModalPage(1); // Always reset to first page when opening a batch
  };

  const resetForm = () => {
    setFormData({
      code: '',
      amount: '',
      expiryDate: '',
      type: 'gift',
      description: '',
      count: 1
    });
    setIsSidebarOpen(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to revoke this voucher?')) return;
    try {
      await api.delete(`/coupons/${id}`);
      toast.success('Voucher revoked');
      
      if (viewingBatch) {
        const updatedItems = viewingBatch.items.filter(item => item._id !== id);
        // If the current page becomes empty after deletion, move back a page
        const newTotalModalPages = Math.ceil(updatedItems.length / modalItemsPerPage);
        if (modalPage > newTotalModalPages && modalPage > 1) {
          setModalPage(newTotalModalPages);
        }
        
        setViewingBatch(prev => ({
          ...prev,
          items: updatedItems
        }));
      }
      
      loadData();
    } catch (err) {
      toast.error('Failed to revoke');
    }
  };

  const handleBatchDelete = async (batchId, batchName) => {
    if (!window.confirm(`Are you sure you want to revoke ALL vouchers in "${batchName}"?`)) return;
    try {
      await api.delete(`/api/coupons/batch/${batchId}`);
      toast.success('Batch revoked');
      setViewingBatch(null);
      loadData();
    } catch (err) {
      toast.error('Failed to revoke batch');
    }
  };

  // Logic to group coupons
  const displayGroups = [];
  const processedBatches = new Set();

  const getVisualStatus = (item) => {
    if (item.status === 'redeemed') return 'redeemed';
    if (item.status === 'expired' || new Date(item.expiryDate) < new Date()) return 'expired';
    return item.status;
  };

  coupons.forEach(coupon => {
    if (coupon.batchId) {
      if (!processedBatches.has(coupon.batchId)) {
        const batchItems = coupons.filter(c => c.batchId === coupon.batchId);
        const statuses = new Set(batchItems.map(getVisualStatus));
        let batchStatus = 'active';
        if (statuses.size > 1) batchStatus = 'mixed';
        else if (statuses.has('expired')) batchStatus = 'expired';
        else if (statuses.has('redeemed')) batchStatus = 'redeemed';

        displayGroups.push({
          type: 'batch',
          id: coupon.batchId,
          name: coupon.batchName || 'Unnamed Batch',
          items: batchItems,
          amount: coupon.amount,
          expiryDate: coupon.expiryDate,
          couponType: coupon.type,
          status: batchStatus
        });
        processedBatches.add(coupon.batchId);
      }
    } else {
      displayGroups.push({ type: 'single', item: coupon });
    }
  });

  // Calculate Pagination (Main Table)
  const totalPages = Math.ceil(displayGroups.length / itemsPerPage);
  const paginatedGroups = displayGroups.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Calculate Pagination (Modal Popup)
  const totalModalPages = viewingBatch ? Math.ceil(viewingBatch.items.length / modalItemsPerPage) : 0;
  const paginatedModalItems = viewingBatch ? viewingBatch.items.slice((modalPage - 1) * modalItemsPerPage, modalPage * modalItemsPerPage) : [];

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="page-shell py-12">
        <div className="max-w-7xl mx-auto space-y-8">
          <AdminHeader 
            title="Voucher Management" 
            description="Generate and track pre-paid gift vouchers and promo codes."
            backTo={`/${roleSlug}`}
          />

          <div className="flex justify-between items-center">
            <div className="flex gap-4">
              <div className="bg-white px-6 py-3 rounded-2xl border border-slate-100 shadow-sm">
                 <p className="text-[10px] font-black text-ink/30 uppercase tracking-widest">Active Vouchers</p>
                 <p className="text-2xl font-black text-brand-blue">{coupons.filter(c => c.status === 'active').length}</p>
              </div>
              <div className="bg-white px-6 py-3 rounded-2xl border border-slate-100 shadow-sm">
                 <p className="text-[10px] font-black text-ink/30 uppercase tracking-widest">Total Batches</p>
                 <p className="text-2xl font-black text-emerald-500">{processedBatches.size}</p>
              </div>
            </div>
            {canManage && (
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="bg-brand-blue text-white px-8 py-4 rounded-2xl font-black shadow-glow hover:scale-105 active:scale-95 transition-all"
              >
                + Generate Voucher
              </button>
            )}
          </div>

          {/* Main Table Container */}
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden flex flex-col">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-8 py-6 text-[10px] font-black text-ink/30 uppercase tracking-widest">Voucher Code / Batch Name</th>
                    <th className="px-8 py-6 text-[10px] font-black text-ink/30 uppercase tracking-widest">Type</th>
                    <th className="px-8 py-6 text-[10px] font-black text-ink/30 uppercase tracking-widest">Value</th>
                    <th className="px-8 py-6 text-[10px] font-black text-ink/30 uppercase tracking-widest">Status</th>
                    <th className="px-8 py-6 text-[10px] font-black text-ink/30 uppercase tracking-widest">Expiry</th>
                    <th className="px-8 py-6 text-[10px] font-black text-ink/30 uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedGroups.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-8 py-20 text-center text-ink/20 italic">No vouchers found on this page.</td>
                    </tr>
                  ) : paginatedGroups.map((group) => (
                    <tr key={group.type === 'batch' ? group.id : group.item._id} className="group hover:bg-slate-50/50 transition-all">
                      <td className="px-8 py-6">
                        {group.type === 'batch' ? (
                          <div className="flex flex-col">
                            <span className="font-display font-black text-indigo-600 uppercase text-sm">{group.name}</span>
                            <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Batch Group • {group.items.length} Units</span>
                          </div>
                        ) : (
                          <span className="font-mono font-black text-brand-blue bg-brand-blue/5 px-3 py-1.5 rounded-lg border border-brand-blue/10">
                            {group.item.code}
                          </span>
                        )}
                      </td>
                      <td className="px-8 py-6">
                        <span className="text-[10px] font-black text-ink uppercase tracking-widest opacity-60">
                          {group.type === 'batch' ? group.couponType : group.item.type}
                        </span>
                      </td>
                      <td className="px-8 py-6 font-black text-ink">
                        AED {group.type === 'batch' ? group.items[0].amount : group.item.amount}
                      </td>
                      <td className="px-8 py-6">
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                          (group.type === 'batch' ? group.status : getVisualStatus(group.item)) === 'active' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                          (group.type === 'batch' ? group.status : getVisualStatus(group.item)) === 'redeemed' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' :
                          'bg-rose-50 text-rose-600 border border-rose-100'
                        }`}>
                          {((group.type === 'batch' ? group.status : getVisualStatus(group.item)) === 'redeemed') ? 'Used' : (group.type === 'batch' ? group.status : getVisualStatus(group.item))}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-sm font-bold text-ink/40">
                        {new Date(group.type === 'batch' ? group.items[0].expiryDate : group.item.expiryDate).toLocaleDateString()}
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                          {group.type === 'batch' ? (
                            <button 
                              onClick={() => handleViewBatch(group)} 
                              className="px-5 py-2.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-sm"
                            >
                               View Vouchers
                            </button>
                          ) : (
                            <>
                              <button 
                                onClick={() => window.open(`/print/voucher/${group.item._id}`, '_blank')}
                                className="p-3 bg-brand-blue/5 text-brand-blue hover:bg-brand-blue hover:text-white rounded-xl transition-all"
                              >
                                🖨️
                              </button>
                              <button 
                                onClick={() => handleDelete(group.item._id)} 
                                className="p-3 bg-rose-50 text-rose-400 hover:bg-rose-500 hover:text-white rounded-xl transition-all"
                              >
                                🗑️
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Main Table Pagination */}
            <div className="px-8 py-6 border-t border-slate-50 flex justify-between items-center bg-slate-50/30">
               <button 
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => prev - 1)}
                  className={`px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${currentPage === 1 ? 'text-ink/20' : 'text-brand-blue hover:bg-white shadow-sm'}`}
               >
                  ← Previous
               </button>
               <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-ink/30 uppercase tracking-widest text-center">Page {currentPage} of {Math.max(1, totalPages)}</span>
               </div>
               <button 
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  className={`px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${currentPage >= totalPages ? 'text-ink/20' : 'text-brand-blue hover:bg-white shadow-sm'}`}
               >
                  Next →
               </button>
            </div>
          </div>
        </div>

        {/* Modal View (The "Pop Page") */}
        {viewingBatch && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
             <div className="absolute inset-0 bg-ink/40 backdrop-blur-md" onClick={() => setViewingBatch(null)}></div>
             <div className="relative w-full max-w-4xl bg-white rounded-[40px] shadow-2xl overflow-hidden animate-scale-in max-h-[90vh] flex flex-col">
                <div className="p-10 border-b border-slate-50 flex justify-between items-center bg-indigo-50/30 shrink-0">
                   <div>
                      <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-2 px-1">Batch Detail View</p>
                      <h2 className="font-display text-4xl font-bold text-ink">{viewingBatch.name}</h2>
                      <div className="flex gap-4 mt-3">
                         <span className="text-[10px] font-black text-ink/40 bg-white px-3 py-1 rounded-full border border-slate-100 uppercase tracking-widest">{viewingBatch.items.length} Total Units</span>
                         <span className="text-[10px] font-black text-brand-blue bg-white px-3 py-1 rounded-full border border-slate-100 uppercase tracking-widest">AED {viewingBatch.amount} / ea</span>
                      </div>
                   </div>
                   <button onClick={() => setViewingBatch(null)} className="w-14 h-14 rounded-2xl bg-white text-ink/20 flex items-center justify-center hover:text-ink hover:shadow-lg transition-all text-2xl border border-slate-100">×</button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar relative">
                   <table className="w-full text-left border-collapse min-w-[600px]">
                      <thead className="sticky top-0 z-20 shadow-sm">
                         <tr className="bg-white">
                            <th className="px-10 py-5 text-[10px] font-black text-ink/20 uppercase tracking-widest border-b border-slate-50">S.No</th>
                            <th className="px-10 py-5 text-[10px] font-black text-ink/20 uppercase tracking-widest border-b border-slate-50">Voucher Code</th>
                            <th className="px-10 py-5 text-[10px] font-black text-ink/20 uppercase tracking-widest border-b border-slate-50">Status</th>
                            <th className="px-10 py-5 text-[10px] font-black text-ink/20 uppercase tracking-widest border-b border-slate-50">Created On</th>
                            <th className="px-10 py-5 text-[10px] font-black text-ink/20 uppercase tracking-widest border-b border-slate-50 text-right">Action</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                         {paginatedModalItems.map((item, idx) => (
                           <tr key={item._id} className="group hover:bg-slate-50/50 transition-colors">
                              <td className="px-10 py-5 text-sm font-bold text-ink/20">{(modalPage - 1) * modalItemsPerPage + idx + 1}</td>
                              <td className="px-10 py-5 font-mono text-lg font-black text-brand-blue">{item.code}</td>
                              <td className="px-10 py-5">
                                 <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${
                                    item.status === 'active' ? 'bg-emerald-50 text-emerald-600' :
                                    item.status === 'redeemed' ? 'bg-indigo-50 text-indigo-600' :
                                    'bg-rose-50 text-rose-600'
                                 }`}>
                                    {item.status === 'redeemed' ? 'Used' : item.status}
                                 </span>
                              </td>
                              <td className="px-10 py-5 text-sm font-bold text-ink/40">{new Date(item.createdAt).toLocaleDateString()}</td>
                              <td className="px-10 py-5 text-right">
                                 <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all px-2">
                                    <button onClick={() => window.open(`/print/voucher/${item._id}`, '_blank')} className="p-2.5 bg-slate-50 rounded-xl text-ink/40 hover:bg-brand-blue hover:text-white transition-all">🖨️</button>
                                    <button onClick={() => handleDelete(item._id)} className="p-2.5 bg-slate-50 rounded-xl text-ink/40 hover:bg-rose-500 hover:text-white transition-all">🗑️</button>
                                 </div>
                              </td>
                           </tr>
                         ))}
                      </tbody>
                   </table>
                   
                   {paginatedModalItems.length === 0 && (
                      <div className="p-20 text-center text-ink/20 italic font-bold">This batch is empty or all vouchers have been revoked.</div>
                   )}
                </div>

                {/* Modal Pagination Controls */}
                <div className="px-10 py-6 bg-slate-50/50 border-t border-slate-100 flex justify-between items-center shrink-0">
                   <div className="flex items-center gap-4">
                      <button 
                        disabled={modalPage === 1}
                        onClick={() => setModalPage(prev => prev - 1)}
                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${modalPage === 1 ? 'text-ink/10 cursor-not-allowed' : 'bg-white shadow-sm text-brand-blue hover:bg-brand-blue hover:text-white'}`}
                      >
                         ←
                      </button>
                      <span className="text-[10px] font-black text-ink/30 uppercase tracking-widest">Page {modalPage} of {Math.max(1, totalModalPages)}</span>
                      <button 
                        disabled={modalPage >= totalModalPages}
                        onClick={() => setModalPage(prev => prev + 1)}
                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${modalPage >= totalModalPages ? 'text-ink/10 cursor-not-allowed' : 'bg-white shadow-sm text-brand-blue hover:bg-brand-blue hover:text-white'}`}
                      >
                         →
                      </button>
                   </div>
                   <button onClick={() => handleBatchDelete(viewingBatch.id, viewingBatch.name)} className="px-8 py-4 bg-white border border-rose-100 text-rose-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all shadow-sm">
                      Revoke Entire Batch
                   </button>
                </div>
             </div>
          </div>
        )}

        {/* Create Sidebar */}
        {isSidebarOpen && (
          <div className="fixed inset-0 z-[100] flex justify-end animate-fade-in">
            <div className="absolute inset-0 bg-ink/20 backdrop-blur-sm" onClick={resetForm}></div>
            <div className="relative w-full max-w-lg bg-white shadow-2xl h-screen overflow-y-auto custom-scrollbar animate-slide-left p-10">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="font-display text-3xl font-bold text-ink">Generate Voucher</h2>
                  <p className="text-xs font-black text-brand-blue uppercase tracking-widest mt-1">Configure Issued Properties</p>
                </div>
                <button onClick={resetForm} className="w-12 h-12 rounded-2xl bg-slate-50 text-ink/40 flex items-center justify-center hover:bg-slate-100 transition-all text-xl">×</button>
              </div>

              <form onSubmit={handleSave} className="space-y-8 pb-20">
                <div className="grid gap-6">
                  <div>
                    <label className="text-[10px] font-black text-ink/30 uppercase tracking-[0.2em] block mb-3 px-1">Voucher Type</label>
                    <div className="grid grid-cols-2 gap-3">
                      {['gift', 'promo', 'referral', 'cash_deposit'].map(t => (
                        <button
                          key={t} type="button"
                          onClick={() => setFormData({ ...formData, type: t })}
                          className={`py-4 rounded-2xl border-2 transition-all font-black uppercase text-[10px] tracking-widest ${formData.type === t ? 'border-brand-blue bg-brand-blue/5 text-brand-blue shadow-md' : 'border-slate-50 bg-white hover:border-slate-200 opacity-60'}`}
                        >
                          {t.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-ink/30 uppercase tracking-[0.2em] block mb-3 px-1">Voucher Code (Optional)</label>
                    <input
                      type="text"
                      className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold text-ink focus:ring-2 focus:ring-brand-blue/20 outline-none uppercase"
                      placeholder="LEAVE EMPTY FOR AUTO-GEN"
                      value={formData.code}
                      onChange={e => setFormData({ ...formData, code: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="text-[10px] font-black text-ink/30 uppercase tracking-[0.2em] block mb-3 px-1">Value (AED)</label>
                      <input
                        type="number" required min="1"
                        className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold text-ink focus:ring-2 focus:ring-brand-blue/20 outline-none"
                        value={formData.amount}
                        onChange={e => setFormData({ ...formData, amount: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-ink/30 uppercase tracking-[0.2em] block mb-3 px-1">Count (Batch)</label>
                      <input
                        type="number" required min="1" max="50"
                        className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold text-ink focus:ring-2 focus:ring-brand-blue/20 outline-none"
                        value={formData.count}
                        onChange={e => setFormData({ ...formData, count: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-ink/30 uppercase tracking-[0.2em] block mb-3 px-1">Expiry Date</label>
                    <input
                      type="date" required
                      className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold text-ink focus:ring-2 focus:ring-brand-blue/20 outline-none"
                      value={formData.expiryDate}
                      onChange={e => setFormData({ ...formData, expiryDate: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-ink/30 uppercase tracking-[0.2em] block mb-3 px-1">Batch Description / Name</label>
                    <textarea
                      className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold text-ink focus:ring-2 focus:ring-brand-blue/20 outline-none min-h-[100px]"
                      placeholder="e.g. Winner of Tournament 2026"
                      value={formData.description}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>
                </div>

                <div className="pt-8">
                   <button 
                     type="submit"
                     className="w-full bg-brand-blue text-white py-5 rounded-[24px] font-black text-lg shadow-glow hover:scale-[1.02] active:scale-95 transition-all"
                   >
                     {formData.count > 1 ? `Generate ${formData.count} Vouchers` : 'Issue Voucher'}
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
