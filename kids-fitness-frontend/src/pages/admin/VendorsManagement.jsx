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
                  <div className="pt-4 border-t border-slate-100 flex gap-4 text-sm font-bold">
                    <button onClick={() => handleEdit(vendor)} className="text-brand-blue hover:text-brand-blue/80">Edit</button>
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
      </main>
      <Footer />
    </div>
  );
}
