import { useEffect, useState } from "react";
import { useParams } from 'react-router-dom';
import Navbar from '../../components/Navbar.jsx';
import Footer from '../../components/Footer.jsx';
import toast from 'react-hot-toast';
import { usePermissions } from '../../hooks/usePermissions.js';
import { useAuth } from '../../context/AuthContext.jsx';
import api from '../../api/api.js';
import AdminHeader from '../../components/AdminHeader.jsx';

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
  { id: 'reports', label: 'Detailed Reports' },
  { id: 'promotions', label: 'Promotions Management' },
  { id: 'roles', label: 'Role Master' },
  { id: 'expenses', label: 'Expense Management' },
  { id: 'profit_loss', label: 'Profit & Loss' },
  { id: 'shifts', label: 'Shift Management' }
];

const ACTIONS = [
  { id: 'view', label: 'View', color: 'bg-blue-50 text-blue-600' },
  { id: 'create', label: 'Create', color: 'bg-green-50 text-green-600' },
  { id: 'edit', label: 'Edit', color: 'bg-amber-50 text-amber-600' },
  { id: 'delete', label: 'Delete', color: 'bg-red-50 text-red-600' }
];

export default function RoleMaster() {
  const { roleSlug } = useParams();
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissions: [],
    status: 'active'
  });
  const { refreshUser } = useAuth();

  const { can } = usePermissions();

  const canCreate = can('roles:create');
  const canEdit = can('roles:edit');
  const canDelete = can('roles:delete');

  const load = () => {
    setLoading(true);
    api.get('/roles?all=true')
      .then((res) => {
        const dbRoles = res.data || [];
        const superadminRole = {
          _id: 'sys-superadmin',
          name: 'Superadmin',
          description: 'Unrestricted system access',
          status: 'active',
          isSystem: true,
          permissions: MODULES.flatMap(m => ACTIONS.map(a => `${m.id}:${a.id}`))
        };
        let adminRole = dbRoles.find(r => r.name.toLowerCase() === 'admin');
        if (!adminRole) {
          adminRole = {
            _id: 'sys-admin',
            name: 'Admin',
            description: 'Administrative system access',
            status: 'active',
            isSystem: false, // Make admin editable
            permissions: MODULES.flatMap(m => ACTIONS.map(a => `${m.id}:${a.id}`))
          };
        } else {
          adminRole.isSystem = false;
        }
        
        const otherRoles = dbRoles.filter(r => r.name.toLowerCase() !== 'admin');
        setRoles([superadminRole, adminRole, ...otherRoles]);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleTogglePerm = (moduleId, actionId) => {
    const permKey = `${moduleId}:${actionId}`;
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permKey)
        ? prev.permissions.filter(p => p !== permKey)
        : [...prev.permissions, permKey]
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editingRole && !editingRole._id.startsWith('sys-')) {
        await api.put(`/roles/${editingRole._id}`, formData);
        toast.success('Role updated');
      } else {
        await api.post('/roles', formData);
        toast.success('Role created');
      }
      resetForm();
      load();
      refreshUser();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save role');
    }
  };

  const resetForm = () => {
    setEditingRole(null);
    setFormData({ name: '', description: '', permissions: [], status: 'active' });
  };

  const startEdit = (role) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      description: role.description || '',
      permissions: role.permissions || [],
      status: role.status || 'active'
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToggleStatus = async (role) => {
    const action = role.status === 'active' ? 'disable' : 'enable';
    if (!window.confirm(`Are you sure you want to ${action} this role?`)) return;
    try {
      await api.delete(`/roles/${role._id}`);
      toast.success(`Role ${action}d successfully`);
      load();
      refreshUser();
    } catch (err) {
      const msg = err.response?.data?.message || `Failed to ${action} role`;
      toast.error(msg);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="page-shell py-12">
        <AdminHeader 
          title="Role Master" 
          description="Define granular CRUD access and feature visibility for staff roles."
          backTo={`/${roleSlug}`}
        />

        <div className="mt-8">
          {/* Header content moved to AdminHeader */}
        </div>

        <div className="grid gap-8 lg:grid-cols-5">
          {/* Form */}
          {(canCreate || (editingRole && canEdit)) ? (
            <div className="lg:col-span-2">
              <div className="sticky top-8 rounded-[32px] bg-white p-8 shadow-xl border border-slate-100">
              <h2 className="font-display text-xl font-bold text-ink mb-6">
                {editingRole ? 'Edit Role' : 'Create New Role'}
              </h2>
              <form onSubmit={handleSave} className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-ink/30 uppercase tracking-widest block mb-2 px-1">Role name</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-slate-50 border-none rounded-2xl py-3 px-4 text-sm font-bold text-ink focus:ring-2 focus:ring-coral/10 outline-none transition-all"
                    placeholder="e.g. Store Incharge"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-ink/30 uppercase tracking-widest block mb-2 px-1">Description</label>
                  <textarea
                    className="w-full bg-slate-50 border-none rounded-2xl py-3 px-4 text-sm font-bold text-ink focus:ring-2 focus:ring-coral/10 outline-none transition-all resize-none h-20"
                    placeholder="What can this role do?"
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-ink/30 uppercase tracking-widest block mb-4 px-1">Granular Permissions</label>
                  <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {MODULES.map(mod => (
                      <div key={mod.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-black text-ink uppercase tracking-wider">{mod.label}</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {ACTIONS.map(action => {
                            const permKey = `${mod.id}:${action.id}`;
                            const isSelected = formData.permissions.includes(permKey);
                            return (
                              <button
                                key={action.id}
                                type="button"
                                onClick={() => handleTogglePerm(mod.id, action.id)}
                                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tight transition-all border ${isSelected ? `${action.color} border-current ring-2 ring-current ring-opacity-10` : 'bg-white text-ink/30 border-slate-200'}`}
                              >
                                {action.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button type="submit" className="flex-1 bg-ink text-white rounded-2xl py-4 text-sm font-black uppercase tracking-widest hover:bg-ink/90 transition-all active:scale-95 shadow-md">
                    {editingRole ? 'Update Role' : 'Create Role'}
                  </button>
                  {editingRole && (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="px-6 bg-slate-100 text-ink/40 rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                    >
                      ×
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-2 text-center py-10 bg-white/50 rounded-[32px] border border-dashed border-slate-200">
             <p className="text-sm font-bold text-ink/30 italic">You don't have permission to {editingRole ? 'edit' : 'create'} roles.</p>
          </div>
        )}

        {/* List */}
        <div className="lg:col-span-3">
            {loading ? (
              <div className="py-20 flex justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-coral border-t-transparent" /></div>
            ) : roles.length > 0 ? (
              <div className="grid gap-4">
                {roles.map(role => (
                  <div key={role._id} className={`rounded-[32px] bg-white p-6 shadow-sm border border-slate-100 hover:shadow-md transition-all group ${role.status === 'inactive' ? 'opacity-60 grayscale-[0.5]' : ''}`}>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-3">
                          <h3 className="font-display text-xl font-bold text-ink">{role.name}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${role.isSystem ? 'bg-brand-blue text-white' : role.status === 'active' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                            {role.isSystem ? 'System Role' : role.status || 'Active'}
                          </span>
                        </div>
                        <p className="text-xs text-ink/40 font-bold mt-1 uppercase tracking-widest">{role.description || 'No description'}</p>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {canEdit && !role.isSystem && (
                          <button onClick={() => startEdit(role)} className="h-10 w-10 flex items-center justify-center rounded-xl bg-slate-50 text-ink/40 hover:bg-brand-blue/5 hover:text-brand-blue transition-all">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </button>
                        )}
                        {canDelete && !role.isSystem && (
                          <button
                            onClick={() => handleToggleStatus(role)}
                            className={`h-10 px-4 flex items-center justify-center rounded-xl transition-all shadow-sm ${role.status === 'inactive' ? 'bg-green-50 text-green-500 hover:bg-green-500 hover:text-white' : 'bg-red-50 text-red-500 hover:bg-red-500 hover:text-white'}`}
                            title={role.status === 'inactive' ? 'Enable Role' : 'Disable Role'}
                          >
                            <span className="text-[10px] font-black uppercase tracking-widest">
                              {role.status === 'active' ? 'Disable' : 'Enable'}
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                       {/* High-level summary of perms */}
                       {MODULES.map(mod => {
                         const modPerms = role.permissions.filter(p => p.startsWith(`${mod.id}:`));
                         if (modPerms.length === 0) return null;
                         return (
                           <div key={mod.id} className="flex items-center gap-1.5 bg-slate-50 rounded-lg px-2 py-1 border border-slate-100">
                             <span className="text-[9px] font-black text-ink/40 uppercase tracking-tighter">{mod.label}</span>
                             <div className="flex gap-0.5">
                               {ACTIONS.map(action => {
                                 const exists = role.permissions.includes(`${mod.id}:${action.id}`);
                                 return exists ? (
                                   <div key={action.id} className={`w-1.5 h-1.5 rounded-full ${action.id === 'view' ? 'bg-blue-400' : action.id === 'create' ? 'bg-green-400' : action.id === 'edit' ? 'bg-amber-400' : 'bg-red-400'}`} title={action.label} />
                                 ) : null;
                               })}
                             </div>
                           </div>
                         );
                       })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-20 text-center bg-white rounded-[32px] border border-slate-100 border-dashed">
                <p className="text-slate-400 italic font-medium">No custom roles created successfully yet.</p>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
