import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Navbar from '../../components/Navbar.jsx';
import Footer from '../../components/Footer.jsx';
import api from '../../api/api.js';
import toast from 'react-hot-toast';
import AdminHeader from '../../components/AdminHeader.jsx';
import { usePermissions } from '../../hooks/usePermissions.js';
import { useBranch } from '../../context/BranchContext.jsx';

const MODULES = [
  { id: 'classes', label: 'Classes' },
  { id: 'programs', label: 'Programs' },
  { id: 'sessions', label: 'Session Calendar' },
  { id: 'trainers', label: 'Trainer Master' },
  { id: 'pricing', label: 'Pricing & Plans' },
  { id: 'bookings', label: 'Booking Management' },
  { id: 'users', label: 'User Management' },
  { id: 'trials', label: 'Trial Requests' },
  { id: 'attendance', label: 'Attendance Tracker' },
  { id: 'payments', label: 'Payment Monitoring' },
  { id: 'memberships', label: 'Membership Subscriptions' },
  { id: 'locations', label: 'Branch Management' },
  { id: 'specialties', label: 'Specialty Master' },
  { id: 'disable', label: 'Disable', color: 'bg-red-50 text-red-600' },
  { id: 'reports', label: 'Detailed Reports' },
  { id: 'roles', label: 'Role Master' }
];

const ACTIONS = [
  { id: 'view', label: 'View' },
  { id: 'create', label: 'Create' },
  { id: 'edit', label: 'Edit' },
  { id: 'deactivate', label: 'Deactivate' }
];

export default function UsersManagement() {
  const { roleSlug } = useParams();
  const [users, setUsers] = useState([]);
  const [expandedUser, setExpandedUser] = useState(null);
  const [userChildren, setUserChildren] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [uatFilter, setUatFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [customRoles, setCustomRoles] = useState([]);
  const [locations, setLocations] = useState([]);
  const [editingUserId, setEditingUserId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  
  // Password Reset State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [resetUser, setResetUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  
  // Staff Creation Form State
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [staffForm, setStaffForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'admin',
    phone: '',
    locationIds: [],
    allowUAT: false,
    canManageShifts: false
  });

  const { can, user } = usePermissions();
  const { selectedBranch } = useBranch();

  const canCreate = can('users:create');
  const canEdit = can('users:edit');
  const canDelete = can('users:delete');

  const load = () => {
    setLoading(true);
    api.get('/users?all=true')
      .then((res) => {
        setUsers(res.data || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    load();
    api.get('/roles').then(res => setCustomRoles(res.data || [])).catch(() => {});
    api.get('/locations?all=true').then(res => setLocations(res.data || [])).catch(() => {});
  }, []);

  const updateRole = async (id, role) => {
    try {
      await api.put(`/users/${id}`, { role });
      toast.success('User role updated');
      load();
    } catch (err) {
      toast.error('Failed to update role');
    }
  };

  const handleToggleUATAccess = async (targetUser) => {
    try {
      const nextUAT = !targetUser.allowUAT;
      await api.put(`/users/${targetUser._id}`, { allowUAT: nextUAT });
      toast.success(`UAT Access ${nextUAT ? 'allowed' : 'restricted'} for ${targetUser.name}`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update UAT Access');
    }
  };

  const handleToggleStatus = async (u) => {
    const action = u.status === 'inactive' ? 'activate' : 'deactivate';
    if (!window.confirm(`Are you sure you want to ${action} this user?`)) return;
    try {
      await api.delete(`/users/${u._id}`);
      toast.success(`User ${action}d successfully`);
      load();
    } catch (err) {
      const msg = err.response?.data?.message || `Failed to ${action} user`;
      toast.error(msg);
    }
  };

  const fetchChildren = async (userId) => {
    if (userChildren[userId]) return;
    try {
      const res = await api.get(`/users/${userId}/children`);
      setUserChildren(prev => ({ ...prev, [userId]: res.data }));
    } catch (err) {
      console.error('Failed to fetch children');
    }
  };

  const handleEdit = (u) => {
    setEditingUserId(u._id);
    setStaffForm({
      name: u.name || '',
      email: u.email || '',
      password: '', // Leave blank for security, only update if provided (backend might need adjustment if password is required)
      role: u.role || 'customer',
      phone: u.phone || '',
      locationIds: (u.locationIds || []).map(l => l._id || l),
      allowUAT: u.allowUAT || false,
      canManageShifts: u.canManageShifts || false
    });
    setShowAddStaff(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    try {
      if (editingUserId) {
        // Prepare update payload (exclude password if blank)
        const payload = { ...staffForm };
        if (!payload.password) delete payload.password;
        
        await api.put(`/users/${editingUserId}`, payload);
        toast.success('User updated successfully');
      } else {
        await api.post('/users', staffForm);
        toast.success('Staff user created successfully');
      }
      setShowAddStaff(false);
      setEditingUserId(null);
      setStaffForm({ name: '', email: '', password: '', role: 'admin', phone: '', locationIds: [], allowUAT: false, canManageShifts: false });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save user');
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      return toast.error('Password must be at least 6 characters');
    }
    setIsResetting(true);
    try {
      await api.put(`/users/${resetUser._id}/password`, { password: newPassword });
      toast.success('Password updated successfully');
      setShowPasswordModal(false);
      setResetUser(null);
      setNewPassword('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update password');
    } finally {
      setIsResetting(false);
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      !searchQuery ||
      u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.phone?.includes(searchQuery);

    const matchesRole = 
      roleFilter === 'all' || 
      u.role?.toLowerCase() === roleFilter.toLowerCase();

    const matchesUat = 
      uatFilter === 'all' || 
      (uatFilter === 'allowed' && (u.role === 'superadmin' || u.allowUAT)) ||
      (uatFilter === 'restricted' && u.role !== 'superadmin' && !u.allowUAT);

    const matchesStatus = 
      statusFilter === 'all' || 
      (statusFilter === 'active' && (u.status === 'active' || !u.status)) ||
      (statusFilter === 'inactive' && u.status === 'inactive');

    const matchesBranch = 
      !selectedBranch || 
      selectedBranch === 'all' || 
      (u.role === 'superadmin') ||
      (u.locationIds && u.locationIds.some(loc => 
        (typeof loc === 'string' ? loc : loc._id) === selectedBranch
      ));

    return matchesSearch && matchesRole && matchesUat && matchesStatus && matchesBranch;
  });

  // Pagination Logic
  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Reset to page 1 on search or filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, roleFilter, uatFilter, statusFilter]);

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="page-shell py-12">
        <AdminHeader 
          title="Staff & User Management" 
          description="Manage access, roles, and profiles for everyone on the platform."
          backTo={`/${roleSlug}`}
          actions={canCreate && (
            <button 
              onClick={() => {
                if (showAddStaff) {
                  setShowAddStaff(false);
                  setEditingUserId(null);
                  setStaffForm({ name: '', email: '', password: '', role: 'admin', phone: '', locationIds: [], allowUAT: false, canManageShifts: false });
                } else {
                  setShowAddStaff(true);
                }
              }}
              className="bg-ink text-white px-8 py-4 rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-ink/90 transition-all active:scale-95 shadow-xl flex items-center gap-3"
            >
              {showAddStaff ? 'Cancel' : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                  Add New Staff
                </>
              )}
            </button>
          )}
        />

        <div className="mt-8 mb-10">
          {/* Header content moved to AdminHeader */}
        </div>

        {/* Staff Creation / Edit Form */}
        {showAddStaff && (
          <div className="mb-10 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="bg-white rounded-[32px] p-8 shadow-2xl border border-slate-100 max-w-2xl mx-auto">
              <h2 className="font-display text-xl font-bold text-ink mb-6">{editingUserId ? 'Edit User Profile' : 'Create Staff Account'}</h2>
              <form onSubmit={handleCreateStaff} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] font-black text-ink/30 uppercase tracking-widest block mb-2">Full Name</label>
                  <input type="text" required value={staffForm.name} onChange={e => setStaffForm({...staffForm, name: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl py-3 px-4 text-sm font-bold" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-ink/30 uppercase tracking-widest block mb-2">Email Address</label>
                  <input type="email" required value={staffForm.email} onChange={e => setStaffForm({...staffForm, email: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl py-3 px-4 text-sm font-bold" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-ink/30 uppercase tracking-widest block mb-2">Password {editingUserId && '(Leave blank to keep current)'}</label>
                  <input type="password" required={!editingUserId} value={staffForm.password} onChange={e => setStaffForm({...staffForm, password: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl py-3 px-4 text-sm font-bold" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-ink/30 uppercase tracking-widest block mb-2">Phone Number</label>
                  <input type="text" value={staffForm.phone} onChange={e => setStaffForm({...staffForm, phone: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl py-3 px-4 text-sm font-bold" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-ink/30 uppercase tracking-widest block mb-2">Role</label>
                  <select value={staffForm.role} onChange={e => setStaffForm({...staffForm, role: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl py-3 px-4 text-sm font-bold">
                    <option value="customer">Customer</option>
                    <option value="trainer">Trainer</option>
                    <option value="admin">Admin</option>
                    <option value="superadmin">Superadmin</option>
                    {customRoles.map(r => <option key={r._id} value={r.name}>{r.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-ink/30 uppercase tracking-widest block mb-2">UAT Environment Access</label>
                  <label className="flex items-center gap-3 bg-slate-50 rounded-2xl py-3 px-4 text-sm font-bold cursor-pointer hover:bg-slate-100/80 transition-all min-h-[44px]">
                    <input 
                      type="checkbox"
                      className="h-5 w-5 rounded border-slate-300 text-coral focus:ring-coral transition-all cursor-pointer"
                      checked={staffForm.allowUAT}
                      onChange={e => setStaffForm({...staffForm, allowUAT: e.target.checked})}
                    />
                    <span className="text-xs font-bold text-ink">Allow UAT Access</span>
                  </label>
                </div>
                <div>
                  <label className="text-[10px] font-black text-ink/30 uppercase tracking-widest block mb-2">Shift Management</label>
                  <label className="flex items-center gap-3 bg-slate-50 rounded-2xl py-3 px-4 text-sm font-bold cursor-pointer hover:bg-slate-100/80 transition-all min-h-[44px]">
                    <input 
                      type="checkbox"
                      className="h-5 w-5 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500 transition-all cursor-pointer"
                      checked={staffForm.canManageShifts}
                      onChange={e => setStaffForm({...staffForm, canManageShifts: e.target.checked})}
                    />
                    <span className="text-xs font-bold text-ink">Enable Shift Button</span>
                  </label>
                </div>
                {user?.role === 'superadmin' && (
                  <div className="md:col-span-2">
                    <label className="text-[10px] font-black text-ink/30 uppercase tracking-widest block mb-4">Branch Assignment (Select multiple)</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {locations.map(loc => (
                        <label key={loc._id} className={`flex items-center gap-3 p-3 rounded-2xl border transition-all cursor-pointer ${staffForm.locationIds.includes(loc._id) ? 'bg-coral/5 border-coral text-coral' : 'bg-slate-50 border-transparent text-ink/40'}`}>
                          <input 
                            type="checkbox" 
                            className="hidden"
                            checked={staffForm.locationIds.includes(loc._id)}
                            onChange={(e) => {
                              const ids = e.target.checked 
                                ? [...staffForm.locationIds, loc._id]
                                : staffForm.locationIds.filter(id => id !== loc._id);
                              setStaffForm({...staffForm, locationIds: ids});
                            }}
                          />
                          <div className={`h-5 w-5 rounded-lg border-2 flex items-center justify-center transition-all ${staffForm.locationIds.includes(loc._id) ? 'bg-coral border-coral' : 'border-slate-200'}`}>
                            {staffForm.locationIds.includes(loc._id) && (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-white" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                            )}
                          </div>
                          <span className="text-xs font-bold uppercase tracking-tight">{loc.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                <div className="md:col-span-2">
                  <button type="submit" className="w-full bg-coral text-white py-4 rounded-2xl text-sm font-black uppercase tracking-widest hover:brightness-110 shadow-lg shadow-coral/20">
                    {editingUserId ? 'Update account info' : 'Create account'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              className="w-full bg-white border border-slate-200 rounded-3xl py-4 px-12 text-sm font-bold text-ink shadow-sm focus:ring-4 focus:ring-coral/5 transition-all outline-none"
              placeholder="Search by name, email, or phone..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute left-4 top-4 text-ink/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center">
            {/* Role Filter */}
            <select
              className="bg-white border border-slate-200 rounded-2xl py-3.5 px-4 text-xs font-black uppercase tracking-wider text-ink focus:ring-4 focus:ring-coral/5 outline-none cursor-pointer shadow-sm min-w-[140px]"
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
            >
              <option value="all">All Roles</option>
              <option value="customer">Customer</option>
              <option value="trainer">Trainer</option>
              <option value="admin">Admin</option>
              <option value="superadmin">Superadmin</option>
              {customRoles.map(r => (
                <option key={r._id} value={r.name}>{r.name}</option>
              ))}
            </select>

            {/* UAT Filter */}
            <select
              className="bg-white border border-slate-200 rounded-2xl py-3.5 px-4 text-xs font-black uppercase tracking-wider text-ink focus:ring-4 focus:ring-coral/5 outline-none cursor-pointer shadow-sm min-w-[160px]"
              value={uatFilter}
              onChange={e => setUatFilter(e.target.value)}
            >
              <option value="all">All UAT Statuses</option>
              <option value="allowed">UAT Allowed</option>
              <option value="restricted">UAT Restricted</option>
            </select>

            {/* Status Filter */}
            <select
              className="bg-white border border-slate-200 rounded-2xl py-3.5 px-4 text-xs font-black uppercase tracking-wider text-ink focus:ring-4 focus:ring-coral/5 outline-none cursor-pointer shadow-sm min-w-[130px]"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Users List */}
        <div className="space-y-4">
          {loading ? (
            <div className="py-20 flex justify-center"><div className="h-10 w-10 animate-spin rounded-full border-[6px] border-coral border-t-transparent" /></div>
          ) : paginatedUsers.length > 0 ? (
            paginatedUsers.map((user) => (
              <div key={user._id} className="group rounded-[36px] bg-white border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden">
                <div className="p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-8">
                  <div className="flex items-center gap-6">
                    <div className="h-20 w-20 rounded-[28px] bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center border border-slate-200 group-hover:scale-105 transition-transform">
                      {user.avatarUrl ? (
                         <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover rounded-[28px]" />
                      ) : (
                        <span className="text-2xl font-black text-ink/10">{user.name?.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="font-display text-2xl font-black text-ink tracking-tight">{user.name}</h3>
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${user.role === 'superadmin' ? 'bg-ink text-white' : user.role === 'admin' ? 'bg-coral/10 text-coral' : 'bg-slate-100 text-ink/40'}`}>
                          {user.role}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${user.status === 'inactive' ? 'bg-red-100 text-red-500' : 'bg-green-100 text-green-500'}`}>
                          {user.status || 'Active'}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm font-bold text-ink/50">
                        <span className="flex items-center gap-2"><svg className="h-4 w-4 text-coral/40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>{user.email}</span>
                        {user.phone && <span className="flex items-center gap-2"><svg className="h-4 w-4 text-coral/40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>{user.phone}</span>}
                        {user.locationIds && user.locationIds.length > 0 && (
                          <span className="flex items-center gap-2">
                            <svg className="h-4 w-4 text-coral/40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            {user.locationIds.map(l => l.name).join(', ')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                    <div className="flex flex-wrap items-end md:items-center md:justify-end gap-3 sm:gap-4 border-t md:border-t-0 pt-6 md:pt-0 border-slate-100 mt-4 md:mt-0 w-full md:w-auto ml-auto">
                      {canEdit && (
                        <div className="flex flex-col gap-1 w-full sm:w-auto sm:flex-1 md:flex-none">
                          <label className="text-[9px] font-black text-ink/20 uppercase tracking-widest px-1">Control access</label>
                          <select
                            className="w-full rounded-2xl bg-slate-50 border border-slate-200 px-5 py-3 text-xs font-black uppercase tracking-wider text-ink focus:ring-4 focus:ring-coral/5 outline-none cursor-pointer transition-all"
                            value={user.role}
                            onChange={(event) => updateRole(user._id, event.target.value)}
                          >
                            <option value="customer">Customer</option>
                            <option value="trainer">Trainer</option>
                            <option value="admin">Admin</option>
                            <option value="superadmin">Superadmin</option>
                            {customRoles.map(r => (
                              <option key={r._id} value={r.name}>{r.name}</option>
                            ))}
                          </select>
                        </div>
                      )}
                      {canEdit && (
                        <button
                          onClick={() => handleEdit(user)}
                          className="h-14 w-14 flex items-center justify-center rounded-2xl bg-amber-50 text-amber-500 hover:bg-amber-500 hover:text-white transition-all active:scale-95 shadow-sm"
                          title="Edit Profile"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                      )}
                      {canEdit && (
                        <button
                          onClick={() => handleToggleUATAccess(user)}
                          disabled={user.role === 'superadmin'}
                          className={`h-14 w-14 flex items-center justify-center rounded-2xl transition-all active:scale-95 shadow-sm ${
                            user.role === 'superadmin' 
                              ? 'bg-purple-100/50 text-purple-400 cursor-not-allowed'
                              : user.allowUAT
                                ? 'bg-purple-50 text-purple-600 hover:bg-purple-600 hover:text-white'
                                : 'bg-slate-50 text-slate-400 hover:bg-slate-200 hover:text-slate-600'
                          }`}
                          title={
                            user.role === 'superadmin' 
                              ? 'Superadmins have UAT access by default' 
                              : user.allowUAT 
                                ? 'Revoke UAT Access' 
                                : 'Allow UAT Access'
                          }
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.11a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                          </svg>
                        </button>
                      )}
                      {canEdit && (
                        <button
                          onClick={() => {
                            setResetUser(user);
                            setShowPasswordModal(true);
                          }}
                          className="h-14 w-14 flex items-center justify-center rounded-2xl bg-brand-blue/5 text-brand-blue hover:bg-brand-blue hover:text-white transition-all active:scale-95 shadow-sm"
                          title="Change Password"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                          </svg>
                        </button>
                      )}
                      <button 
                        onClick={() => {
                          const next = expandedUser === user._id ? null : user._id;
                          setExpandedUser(next);
                          if (next) fetchChildren(user._id);
                        }}
                        className={`h-14 px-6 rounded-2xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap flex-1 sm:flex-none ${expandedUser === user._id ? 'bg-coral text-white' : 'bg-slate-50 text-ink/40 hover:bg-slate-100'}`}
                      >
                        {expandedUser === user._id ? 'Close info' : 'View full profile'}
                      </button>
                      {canDelete && (
                        <button
                          onClick={() => handleToggleStatus(user)}
                          className={`h-14 w-14 flex items-center justify-center rounded-2xl transition-all active:scale-95 shadow-sm ${user.status === 'inactive' ? 'bg-green-50 text-green-500 hover:bg-green-500 hover:text-white' : 'bg-red-50 text-red-500 hover:bg-red-500 hover:text-white'}`}
                          title={user.status === 'inactive' ? 'Activate User' : 'Deactivate User'}
                        >
                          {user.status === 'inactive' ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                          )}
                        </button>
                      )}
                    </div>
                </div>

                {expandedUser === user._id && (
                  <div className="border-t border-slate-100 bg-slate-50/50 p-8 space-y-10 animate-in fade-in duration-500">
                    <div className="grid md:grid-cols-3 gap-12">
                      <div className="space-y-6">
                        <h4 className="text-[10px] font-black text-ink/20 uppercase tracking-[0.2em]">Contact Details</h4>
                        <div className="space-y-4">
                           <div className="flex flex-col"><span className="text-[10px] font-black text-ink/30 uppercase tracking-widest">Address</span><span className="text-xs font-bold text-ink mt-1">{user.address || 'Not provided'}</span></div>
                           <div className="flex flex-col"><span className="text-[10px] font-black text-ink/30 uppercase tracking-widest">Location</span><span className="text-xs font-bold text-ink mt-1">{user.city}, {user.country}</span></div>
                           <div className="flex flex-col"><span className="text-[10px] font-black text-ink/30 uppercase tracking-widest">Joined On</span><span className="text-xs font-bold text-ink mt-1">{new Date(user.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span></div>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <h4 className="text-[10px] font-black text-ink/20 uppercase tracking-[0.2em]">Children ({userChildren[user._id]?.length || 0})</h4>
                        <div className="flex flex-wrap gap-2">
                          {userChildren[user._id]?.map(child => (
                            <div key={child._id} className="bg-white px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-ink/70">
                              {child.name} <span className="text-[10px] text-ink/20 ml-2">({child.age} yrs)</span>
                            </div>
                          ))}
                          {(!userChildren[user._id] || userChildren[user._id].length === 0) && <p className="text-xs text-ink/20 italic">No children linked</p>}
                        </div>
                      </div>

                      <div className="space-y-6">
                        <h4 className="text-[10px] font-black text-ink/20 uppercase tracking-[0.2em]">Active Permissions</h4>
                        <div className="space-y-2">
                          {user.role === 'superadmin' ? (
                            <span className="inline-block bg-ink text-white px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest">Full Platform Access</span>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                               {customRoles.find(r => r.name === user.role)?.permissions?.map(p => (
                                 <span key={p} className="bg-white border border-slate-200 text-ink/40 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter">
                                   {p}
                                 </span>
                                )) || <span className="text-xs text-ink/20">No role-based permissions</span>}
                            </div>
                          )}
                          <div className="mt-4 pt-4 border-t border-slate-200/60">
                            <span className="text-[9px] font-black text-ink/30 uppercase tracking-widest block mb-2">UAT Environment Access</span>
                            {user.role === 'superadmin' || user.allowUAT ? (
                              <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                UAT Allowed
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 bg-slate-100 text-ink/40 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest">
                                UAT Restricted
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="py-20 text-center bg-white rounded-[40px] border-2 border-dashed border-slate-100">
              <p className="text-ink/20 font-bold italic tracking-wide">No users matching your criteria.</p>
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="mt-12 flex items-center justify-between border-t border-slate-200 pt-8">
            <p className="text-[10px] font-black text-ink/30 uppercase tracking-[0.2em]">
              Page {currentPage} of {totalPages}
            </p>
            <div className="flex gap-4">
              <button
                disabled={currentPage === 1}
                onClick={() => {
                  setCurrentPage(prev => prev - 1);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${currentPage === 1 ? 'bg-slate-100 text-ink/10 cursor-not-allowed' : 'bg-white border border-slate-200 text-ink hover:bg-ink hover:text-white shadow-sm'}`}
              >
                ← Prev
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => {
                  setCurrentPage(prev => prev + 1);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${currentPage === totalPages ? 'bg-slate-100 text-ink/10 cursor-not-allowed' : 'bg-white border border-slate-200 text-ink hover:bg-ink hover:text-white shadow-sm'}`}
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Password Reset Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-white rounded-[40px] shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-xl font-black text-ink">Change Password</h3>
                <p className="text-[10px] font-black text-brand-blue uppercase tracking-widest mt-1">For {resetUser?.name}</p>
              </div>
              <button 
                onClick={() => setShowPasswordModal(false)}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white text-ink/20 hover:text-ink/60 shadow-sm border border-slate-100 transition-all font-black text-xl"
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handlePasswordReset} className="p-8 space-y-6">
              <div>
                <label className="text-[10px] font-black text-ink/30 uppercase tracking-widest block mb-2">New Password</label>
                <input 
                  type="password" 
                  autoFocus
                  required 
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full bg-slate-50 border-none rounded-2xl py-4 px-5 text-sm font-bold shadow-inner"
                  placeholder="Minimum 6 characters"
                />
              </div>
              
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="flex-1 py-4 rounded-2xl bg-slate-100 text-ink/40 text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isResetting}
                  className="flex-1 py-4 rounded-2xl bg-brand-blue text-white text-xs font-black uppercase tracking-widest shadow-xl shadow-brand-blue/20 hover:brightness-110 transition-all disabled:opacity-50"
                >
                  {isResetting ? 'Updating...' : 'Set Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
