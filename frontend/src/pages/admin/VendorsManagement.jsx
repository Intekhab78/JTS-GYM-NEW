import { useEffect, useState } from 'react';
import Navbar from '../../components/Navbar.jsx';
import Footer from '../../components/Footer.jsx';
import AdminHeader from '../../components/AdminHeader.jsx';
import api from '../../api/api.js';
import toast from 'react-hot-toast';
import { usePermissions } from '../../hooks/usePermissions.js';

const emptyForm = {
  name: '',
  companyName: '',
  email: '',
  phone: '',
  status: 'active'
};

export default function VendorsManagement() {
  const [vendors, setVendors] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // New state for vendor prices view
  const [isPricesModalOpen, setIsPricesModalOpen] = useState(false);
  const [selectedVendorForPrices, setSelectedVendorForPrices] = useState(null);
  const [vendorPricesData, setVendorPricesData] = useState({ classes: [], plans: [] });
  const [loadingPrices, setLoadingPrices] = useState(false);

  const { isAdminOrSuper } = usePermissions();
  const canManage = isAdminOrSuper; // Only admin/superadmin can manage vendors

  const fetchVendors = () => {
    setLoading(true);
    api.get('/vendors')
      .then(res => setVendors(res.data))
      .catch(err => toast.error('Failed to load vendors'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name) return toast.error('Vendor name is required');
    try {
      if (editingId) {
        await api.put(`/vendors/${editingId}`, form);
        toast.success('Vendor updated successfully');
      } else {
        await api.post('/vendors', form);
        toast.success('Vendor created successfully');
      }
      setForm(emptyForm);
      setEditingId(null);
      setIsModalOpen(false);
      fetchVendors();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save vendor');
    }
  };

  const handleEdit = (vendor) => {
    setEditingId(vendor._id);
    setForm({
      name: vendor.name || '',
      companyName: vendor.companyName || '',
      email: vendor.email || '',
      phone: vendor.phone || '',
      status: vendor.status || 'active'
    });
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (vendor) => {
    const newStatus = vendor.status === 'active' ? 'inactive' : 'active';
    try {
      await api.put(`/vendors/${vendor._id}`, { status: newStatus });
      toast.success(`Vendor marked as ${newStatus}`);
      fetchVendors();
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleViewPrices = async (vendor) => {
    setSelectedVendorForPrices(vendor);
    setIsPricesModalOpen(true);
    setLoadingPrices(true);
    try {
      const [classesRes, plansRes] = await Promise.all([
        api.get('/classes?all=true&locationId=all'),
        api.get('/plans?all=true')
      ]);
      
      const allClasses = classesRes.data || [];
      const allPlans = plansRes.data || [];
      
      const vendorClasses = allClasses.filter(c => c.vendorPrices?.some(vp => vp.vendorId?._id === vendor._id || vp.vendorId === vendor._id));
      const vendorPlans = allPlans.filter(p => p.vendorPrices?.some(vp => vp.vendorId?._id === vendor._id || vp.vendorId === vendor._id));
      
      setVendorPricesData({ classes: vendorClasses, plans: vendorPlans });
    } catch (err) {
      toast.error('Failed to load vendor prices');
    } finally {
      setLoadingPrices(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      <main className="page-shell flex-1 py-12">
        <AdminHeader 
          title="Vendor Master" 
          description="Manage third-party resellers and sales partners."
        />

        <div className="mt-8 flex justify-end">
          {canManage && (
            <button 
              onClick={() => {
                setForm(emptyForm);
                setEditingId(null);
                setIsModalOpen(true);
              }}
              className="bg-brand-blue text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all"
            >
              + Add New Vendor
            </button>
          )}
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {vendors.map(vendor => (
            <div key={vendor._id} className="soft-card rounded-3xl p-6 relative group overflow-hidden">
              <div className={`absolute top-0 left-0 w-2 h-full ${vendor.status === 'active' ? 'bg-green-400' : 'bg-slate-300'}`} />
              <div className="pl-4">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-display text-xl font-black text-ink">{vendor.name}</h3>
                    {vendor.companyName && <p className="text-sm text-ink/60 font-bold">{vendor.companyName}</p>}
                  </div>
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    vendor.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {vendor.status}
                  </span>
                </div>
                
                <div className="space-y-2 text-sm text-ink/70 mb-6">
                  {vendor.email && <p>✉️ {vendor.email}</p>}
                  {vendor.phone && <p>📞 {vendor.phone}</p>}
                </div>

                {canManage && (
                  <div className="pt-4 border-t border-slate-100 flex flex-wrap gap-4 text-sm font-bold">
                    <button onClick={() => handleEdit(vendor)} className="text-brand-blue hover:text-brand-blue/80">Edit</button>
                    <button onClick={() => handleViewPrices(vendor)} className="text-ocean hover:text-ocean/80">View Prices</button>
                    <button 
                      onClick={() => handleToggleStatus(vendor)} 
                      className={vendor.status === 'active' ? 'text-orange-500 hover:text-orange-600' : 'text-green-500 hover:text-green-600'}
                    >
                      {vendor.status === 'active' ? 'Disable' : 'Enable'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {!loading && vendors.length === 0 && (
            <div className="col-span-full py-20 text-center">
               <p className="text-slate-400 italic">No vendors found. Add your first third-party seller above.</p>
            </div>
          )}
        </div>

        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden animate-rise">
              <div className="p-8">
                <h2 className="font-display text-2xl font-black mb-6">{editingId ? 'Edit Vendor' : 'New Vendor'}</h2>
                <form onSubmit={handleSave} className="space-y-4">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-ink/50">Full Name *</label>
                    <input required className="w-full rounded-2xl border-slate-200 bg-slate-50 p-3 text-sm focus:border-coral focus:ring-0 mt-1" name="name" value={form.name} onChange={handleChange} placeholder="Vendor individual name" />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-ink/50">Company Name</label>
                    <input className="w-full rounded-2xl border-slate-200 bg-slate-50 p-3 text-sm focus:border-coral focus:ring-0 mt-1" name="companyName" value={form.companyName} onChange={handleChange} placeholder="Company or Agency name" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-ink/50">Email</label>
                      <input type="email" className="w-full rounded-2xl border-slate-200 bg-slate-50 p-3 text-sm focus:border-coral focus:ring-0 mt-1" name="email" value={form.email} onChange={handleChange} />
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-ink/50">Phone</label>
                      <input className="w-full rounded-2xl border-slate-200 bg-slate-50 p-3 text-sm focus:border-coral focus:ring-0 mt-1" name="phone" value={form.phone} onChange={handleChange} />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-ink/50">Status</label>
                    <select className="w-full rounded-2xl border-slate-200 bg-slate-50 p-3 text-sm focus:border-coral focus:ring-0 mt-1" name="status" value={form.status} onChange={handleChange}>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>

                  <div className="mt-8 flex justify-end gap-4">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 rounded-xl font-bold text-ink/50 hover:text-ink hover:bg-slate-50 transition-colors">Cancel</button>
                    <button type="submit" className="bg-brand-blue text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all">Save Vendor</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Vendor Prices Modal */}
        {isPricesModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden animate-rise flex flex-col">
              <div className="p-8 pb-4 flex justify-between items-center border-b border-slate-100">
                <div>
                  <h2 className="font-display text-2xl font-black">Prices for {selectedVendorForPrices?.name}</h2>
                  <p className="text-sm text-ink/50 mt-1">Special B2B pricing assigned to this vendor</p>
                </div>
                <button onClick={() => setIsPricesModalOpen(false)} className="text-ink/40 hover:text-ink/80 text-3xl leading-none font-light">&times;</button>
              </div>
              
              <div className="p-8 overflow-y-auto flex-1 bg-slate-50/50">
                {loadingPrices ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue"></div>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {/* Classes Table */}
                    <div>
                      <h3 className="text-lg font-black font-display mb-4 flex items-center gap-2">
                        <span>Classes</span>
                        <span className="text-xs bg-brand-blue/10 text-brand-blue px-2 py-0.5 rounded-full">{vendorPricesData.classes.length}</span>
                      </h3>
                      {vendorPricesData.classes.length > 0 ? (
                        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                          <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-xs uppercase tracking-wider text-ink/50 font-bold border-b border-slate-200">
                              <tr>
                                <th className="p-4 font-black">Item Name</th>
                                <th className="p-4 font-black">Regular Price</th>
                                <th className="p-4 font-black">Vendor Price</th>
                                <th className="p-4 font-black">Validity</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {vendorPricesData.classes.map(c => {
                                const vp = c.vendorPrices?.find(v => v.vendorId?._id === selectedVendorForPrices._id || v.vendorId === selectedVendorForPrices._id) || {};
                                return (
                                  <tr key={c._id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="p-4 font-bold text-ink">{c.title}</td>
                                    <td className="p-4 text-ink/50 line-through text-xs">AED {c.price}</td>
                                    <td className="p-4 font-black text-brand-blue text-base">AED {vp.price}</td>
                                    <td className="p-4 text-xs text-ink/60 font-medium">
                                      {vp.startDate ? new Date(vp.startDate).toLocaleDateString() : 'Always'} - {vp.endDate ? new Date(vp.endDate).toLocaleDateString() : 'Always'}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-sm text-ink/40 italic bg-white p-6 rounded-2xl border border-slate-100 text-center">No classes assigned special pricing.</p>
                      )}
                    </div>

                    {/* Plans Table */}
                    <div>
                      <h3 className="text-lg font-black font-display mb-4 flex items-center gap-2">
                        <span>Memberships & Plans</span>
                        <span className="text-xs bg-brand-blue/10 text-brand-blue px-2 py-0.5 rounded-full">{vendorPricesData.plans.length}</span>
                      </h3>
                      {vendorPricesData.plans.length > 0 ? (
                        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                          <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-xs uppercase tracking-wider text-ink/50 font-bold border-b border-slate-200">
                              <tr>
                                <th className="p-4 font-black">Item Name</th>
                                <th className="p-4 font-black">Regular Price</th>
                                <th className="p-4 font-black">Vendor Price</th>
                                <th className="p-4 font-black">Validity</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {vendorPricesData.plans.map(p => {
                                const vp = p.vendorPrices?.find(v => v.vendorId?._id === selectedVendorForPrices._id || v.vendorId === selectedVendorForPrices._id) || {};
                                return (
                                  <tr key={p._id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="p-4 font-bold text-ink">{p.name}</td>
                                    <td className="p-4 text-ink/50 line-through text-xs">AED {p.price}</td>
                                    <td className="p-4 font-black text-brand-blue text-base">AED {vp.price}</td>
                                    <td className="p-4 text-xs text-ink/60 font-medium">
                                      {vp.startDate ? new Date(vp.startDate).toLocaleDateString() : 'Always'} - {vp.endDate ? new Date(vp.endDate).toLocaleDateString() : 'Always'}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-sm text-ink/40 italic bg-white p-6 rounded-2xl border border-slate-100 text-center">No plans assigned special pricing.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="p-6 border-t border-slate-100 bg-white flex justify-end">
                <button onClick={() => setIsPricesModalOpen(false)} className="bg-slate-100 text-ink px-8 py-3 rounded-xl font-bold hover:bg-slate-200 transition-colors">Close</button>
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
