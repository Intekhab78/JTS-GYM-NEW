import { getImageUrl  } from '../../api/api.js';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import Navbar from '../../components/Navbar.jsx';
import Footer from '../../components/Footer.jsx';
import api from '../../api/api.js';
import { useAuth } from '../../context/AuthContext.jsx';

export default function Profile() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    gender: 'other',
    birthDate: '',
    address: '',
    city: '',
    country: 'United Arab Emirates',
    avatarUrl: '',
    instagram: '',
    companyName: '',
    tradeLicenseNo: '',
    taxNumber: '',
    companyAddress: ''
  });

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phone: user.phone || '',
        gender: user.gender || 'other',
        birthDate: user.birthDate ? new Date(user.birthDate).toISOString().split('T')[0] : '',
        address: user.address || '',
        city: user.city || '',
        country: user.country || 'United Arab Emirates',
        avatarUrl: user.avatarUrl || '',
        instagram: user.instagram || '',
        companyName: user.companyName || '',
        tradeLicenseNo: user.tradeLicenseNo || '',
        taxNumber: user.taxNumber || '',
        companyAddress: user.companyAddress || ''
      });
    }
  }, [user]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const data = new FormData();
    data.append('image', file);

    setUploading(true);
    try {
      const res = await api.post('/upload', data);
      setFormData(prev => ({ ...prev, avatarUrl: res.data.image }));
      toast.success('Image uploaded successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setLoading(true);
    try {
      // Create unified 'name' field
      const name = `${formData.firstName} ${formData.lastName}`.trim() || user.name;
      const res = await api.put('/auth/profile', { ...formData, name });
      
      // Update local context and localStorage
      updateUser({ ...user, ...res.data });
      toast.success('Profile updated successfully');
    } catch (err) {
      console.error('Profile update error:', err);
      const msg = err.response?.data?.message || err.message || 'Update failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      
      <main className="page-shell flex-1 py-12">
        <div className="max-w-4xl mx-auto">
          
          <header className="mb-10 text-center">
            <h1 className="font-display text-4xl text-ink font-black">My Profile</h1>
            <p className="mt-2 text-ink/50 font-medium">Manage your personal information and company details.</p>
          </header>

          <form onSubmit={handleSubmit} className="space-y-8 pb-20">
            
            {/* Avatar Section */}
            <section className="soft-card rounded-[40px] p-8 bg-white border-2 border-slate-100 shadow-sm transition-all hover:shadow-md">
              <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="relative group">
                  <div className="w-32 h-32 rounded-[2rem] bg-slate-100 overflow-hidden border-4 border-white shadow-xl">
                    {formData.avatarUrl ? (
                      <img 
                        src={getImageUrl(formData.avatarUrl)} 
                        alt="Avatar" 
                        className="w-full h-full object-cover transition-transform group-hover:scale-110" 
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl font-black text-ink/20">
                        {user?.name?.[0]?.toUpperCase() || '?'}
                      </div>
                    )}
                    {uploading && (
                      <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center">
                        <div className="w-6 h-6 border-2 border-brand-blue border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                  </div>
                  <label className="absolute -bottom-2 -right-2 w-10 h-10 bg-brand-blue text-white rounded-xl shadow-lg flex items-center justify-center cursor-pointer hover:scale-110 active:scale-95 transition-all">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} disabled={uploading} />
                  </label>
                </div>

                <div className="flex-1 text-center md:text-left">
                  <h3 className="text-xl font-display text-ink">Profile Picture</h3>
                  {formData.avatarUrl && (
                    <button 
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, avatarUrl: '' }))}
                      className="mt-4 text-xs font-black uppercase tracking-widest text-red-500 hover:text-red-600 transision-colors"
                    >
                      Remove Photo
                    </button>
                  )}
                </div>
              </div>
            </section>

            {/* Basic Info */}
            <div className="grid gap-8 md:grid-cols-2">
              <div className="soft-card rounded-[40px] p-8 bg-white border-2 border-slate-100 shadow-sm space-y-6">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">👤</span>
                  <p className="text-[10px] font-black text-ink/30 uppercase tracking-[0.2em]">Personal Details</p>
                </div>

                <div className="grid gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-ink/30 uppercase tracking-[0.1em] ml-1">First Name</label>
                    <input 
                      className="w-full bg-slate-50 border-none rounded-2xl py-3 px-5 text-sm font-bold text-ink focus:ring-2 focus:ring-brand-blue/20 outline-none"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      placeholder="e.g. John"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-ink/30 uppercase tracking-[0.1em] ml-1">Last Name</label>
                    <input 
                      className="w-full bg-slate-50 border-none rounded-2xl py-3 px-5 text-sm font-bold text-ink focus:ring-2 focus:ring-brand-blue/20 outline-none"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      placeholder="e.g. Doe"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-ink/30 uppercase tracking-[0.1em] ml-1">Phone Number</label>
                    <input 
                      className="w-full bg-slate-50 border-none rounded-2xl py-3 px-5 text-sm font-bold text-ink focus:ring-2 focus:ring-brand-blue/20 outline-none"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="e.g. +971..."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-ink/30 uppercase tracking-[0.1em] ml-1">Gender</label>
                      <select 
                        className="w-full bg-slate-50 border-none rounded-2xl py-3 px-5 text-sm font-bold text-ink focus:ring-2 focus:ring-brand-blue/20 outline-none"
                        name="gender"
                        value={formData.gender}
                        onChange={handleChange}
                      >
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-ink/30 uppercase tracking-[0.1em] ml-1">Birth Date</label>
                      <input 
                        type="date"
                        className="w-full bg-slate-50 border-none rounded-2xl py-3 px-5 text-sm font-bold text-ink focus:ring-2 focus:ring-brand-blue/20 outline-none"
                        name="birthDate"
                        value={formData.birthDate}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="soft-card rounded-[40px] p-8 bg-white border-2 border-slate-100 shadow-sm space-y-6">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">📍</span>
                  <p className="text-[10px] font-black text-ink/30 uppercase tracking-[0.2em]">Address & Contact</p>
                </div>

                <div className="grid gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-ink/30 uppercase tracking-[0.1em] ml-1">Email Address (Locked)</label>
                    <input 
                      className="w-full bg-slate-100 border-none rounded-2xl py-3 px-5 text-sm font-bold text-ink/40 cursor-not-allowed outline-none"
                      value={user?.email || ''}
                      readOnly
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-ink/30 uppercase tracking-[0.1em] ml-1">Home Address</label>
                    <input 
                      className="w-full bg-slate-50 border-none rounded-2xl py-3 px-5 text-sm font-bold text-ink focus:ring-2 focus:ring-brand-blue/20 outline-none"
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      placeholder="Street, Studio, Flat..."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-ink/30 uppercase tracking-[0.1em] ml-1">City</label>
                      <input 
                        className="w-full bg-slate-50 border-none rounded-2xl py-3 px-5 text-sm font-bold text-ink focus:ring-2 focus:ring-brand-blue/20 outline-none"
                        name="city"
                        value={formData.city}
                        onChange={handleChange}
                        placeholder="e.g. Dubai"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-ink/30 uppercase tracking-[0.1em] ml-1">Country</label>
                      <input 
                        className="w-full bg-slate-50 border-none rounded-2xl py-3 px-5 text-sm font-bold text-ink focus:ring-2 focus:ring-brand-blue/20 outline-none"
                        name="country"
                        value={formData.country}
                        onChange={handleChange}
                        placeholder="e.g. UAE"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-ink/30 uppercase tracking-[0.1em] ml-1">Instagram (@handle)</label>
                    <input 
                      className="w-full bg-slate-50 border-none rounded-2xl py-3 px-5 text-sm font-bold text-ink focus:ring-2 focus:ring-brand-blue/20 outline-none"
                      name="instagram"
                      value={formData.instagram}
                      onChange={handleChange}
                      placeholder="@nickname"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Company Info */}
            <section className="soft-card rounded-[40px] p-8 bg-white border-2 border-slate-100 shadow-sm transition-all hover:shadow-md">
              <div className="flex items-center gap-2 mb-6">
                <span className="text-xl">🏢</span>
                <p className="text-[10px] font-black text-ink/30 uppercase tracking-[0.2em]">Company Information</p>
              </div>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-ink/30 uppercase tracking-[0.1em] ml-1">Company Name</label>
                  <input 
                    className="w-full bg-slate-50 border-none rounded-2xl py-3 px-5 text-sm font-bold text-ink focus:ring-2 focus:ring-brand-blue/20 outline-none"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleChange}
                    placeholder="e.g. Acme Corp"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-ink/30 uppercase tracking-[0.1em] ml-1">Trade License No</label>
                  <input 
                    className="w-full bg-slate-50 border-none rounded-2xl py-3 px-5 text-sm font-bold text-ink focus:ring-2 focus:ring-brand-blue/20 outline-none"
                    name="tradeLicenseNo"
                    value={formData.tradeLicenseNo}
                    onChange={handleChange}
                    placeholder="e.g. 12345/ABC"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-ink/30 uppercase tracking-[0.1em] ml-1">Tax Number (TRN)</label>
                  <input 
                    className="w-full bg-slate-50 border-none rounded-2xl py-3 px-5 text-sm font-bold text-ink focus:ring-2 focus:ring-brand-blue/20 outline-none"
                    name="taxNumber"
                    value={formData.taxNumber}
                    onChange={handleChange}
                    placeholder="e.g. 100xxx...xxx"
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2 lg:col-span-3">
                  <label className="text-[10px] font-black text-ink/30 uppercase tracking-[0.1em] ml-1">Company Registered Address</label>
                  <input 
                    className="w-full bg-slate-50 border-none rounded-2xl py-3 px-5 text-sm font-bold text-ink focus:ring-2 focus:ring-brand-blue/20 outline-none"
                    name="companyAddress"
                    value={formData.companyAddress}
                    onChange={handleChange}
                    placeholder="Flat/Office, Building, Area..."
                  />
                </div>
              </div>
            </section>

            {/* Floating Save Button */}
            <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-40">
              <button 
                type="submit"
                disabled={loading}
                className="bg-brand-blue text-white px-12 py-4 rounded-full font-black uppercase tracking-widest text-xs shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3 disabled:opacity-70"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                  </svg>
                )}
                Save Profile Changes
              </button>
            </div>

          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
}
