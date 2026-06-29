import { getImageUrl  } from '../../api/api.js';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Navbar from '../../components/Navbar.jsx';
import Footer from '../../components/Footer.jsx';
import api from '../../api/api.js';
import AdminHeader from '../../components/AdminHeader.jsx';
import { usePermissions } from '../../hooks/usePermissions.js';

export default function LocationManagement() {
    const { roleSlug } = useParams();
    const [locations, setLocations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        slug: '',
        city: '',
        address: '',
        imageUrl: '',
        status: 'active'
    });
    const [editingId, setEditingId] = useState(null);
    const [uploading, setUploading] = useState(false);
    const { can } = usePermissions();

    const canCreate = can('locations:create');
    const canEdit = can('locations:edit');
    const canDelete = can('locations:delete');

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('image', file);
        setUploading(true);

        try {
            const config = {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            };
            const { data } = await api.post('/upload', formData, config);
            setFormData((prev) => ({ ...prev, imageUrl: data.image }));
        } catch (err) {
            console.error(err);
            alert('File upload failed');
        } finally {
            setUploading(false);
        }
    };

    const fetchLocations = async () => {
        try {
            const res = await api.get('/locations?all=true');
            setLocations(res.data);
        } catch (err) {
            console.error('Failed to fetch locations', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLocations();
    }, []);

    const resetForm = () => {
        setFormData({ name: '', slug: '', city: '', address: '', imageUrl: '', status: 'active' });
        setEditingId(null);
        setShowForm(false);
    };

    const handleEdit = (loc) => {
        setEditingId(loc._id);
        setFormData({
            name: loc.name || '',
            slug: loc.slug || '',
            city: loc.city || '',
            address: loc.address || '',
            imageUrl: loc.imageUrl || '',
            status: loc.status || 'active'
        });
        setShowForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                await api.put(`/locations/${editingId}`, formData);
            } else {
                await api.post('/locations', formData);
            }
            fetchLocations();
            resetForm();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to save location');
        }
    };

    const handleUpdateStatus = async (id, currentStatus) => {
        const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
        try {
            await api.put(`/locations/${id}`, { status: newStatus });
            fetchLocations();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to update status');
        }
    };

    const handleToggleStatus = async (loc) => {
        const action = loc.status === 'active' ? 'disable' : 'enable';
        if (!window.confirm(`Are you sure you want to ${action} this location?`)) return;
        try {
            await api.delete(`/locations/${loc._id}`);
            fetchLocations();
        } catch (err) {
            alert(err.response?.data?.message || `Failed to ${action} location`);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <Navbar />
            <main className="page-shell pb-12 pt-8">
                <AdminHeader 
                    title="Location Management" 
                    description="Manage your gym's physical and virtual presence across different cities."
                    backTo={`/${roleSlug}`}
                    actions={canCreate && (
                        <button
                            onClick={() => setShowForm(!showForm)}
                            className="rounded-full bg-white/10 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20 active:scale-95"
                        >
                            {showForm ? 'Cancel' : 'Add New Location'}
                        </button>
                    )}
                />

                <div className="mt-8 mb-8">
                    {/* Header content moved to AdminHeader */}
                </div>

                {(canCreate || (editingId && canEdit)) && showForm ? (
                    <div className="mb-10 rounded-[32px] bg-white p-8 shadow-sm border border-slate-100">
                        <h2 className="font-display text-2xl text-ink mb-6">
                            {editingId ? 'Edit Location' : 'Create New Location'}
                        </h2>
                        <form onSubmit={handleSubmit} className="grid gap-6 md:grid-cols-2">
                            {/* Form fields... */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-ink/50">Location Name</label>
                                <input
                                    type="text" required
                                    className="w-full rounded-2xl border-slate-200 bg-slate-50 p-3 text-sm focus:border-coral focus:ring-0"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g. Dubai Marina"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-ink/50">Slug (URL snippet)</label>
                                <input
                                    type="text" required
                                    className="w-full rounded-2xl border-slate-200 bg-slate-50 p-3 text-sm focus:border-coral focus:ring-0"
                                    value={formData.slug}
                                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                                    placeholder="e.g. dubai-marina"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-ink/50">City</label>
                                <input
                                    type="text"
                                    className="w-full rounded-2xl border-slate-200 bg-slate-50 p-3 text-sm focus:border-coral focus:ring-0"
                                    value={formData.city}
                                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                    placeholder="Dubai"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-ink/50">Location Image</label>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4 p-4 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50">
                                        <div className="flex-1">
                                            <p className="text-xs font-medium text-ink/60 mb-2">Upload image file (JPG, PNG)</p>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleFileUpload}
                                                className="block w-full text-xs text-slate-500
                                                    file:mr-4 file:py-2 file:px-4
                                                    file:rounded-full file:border-0
                                                    file:text-xs file:font-semibold
                                                    file:bg-coral file:text-white
                                                    hover:file:bg-coral-dark
                                                    cursor-pointer"
                                            />
                                        </div>
                                        {formData.imageUrl && (
                                            <div className="h-20 w-20 rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-white shrink-0 relative group/preview">
                                                <img 
                                                    src={getImageUrl(formData.imageUrl)} 
                                                    alt="Preview" 
                                                    className="h-full w-full object-cover"
                                                />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/preview:opacity-100 transition-opacity flex items-center justify-center">
                                                    <span className="text-[10px] text-white font-bold">Uploaded</span>
                                                </div>
                                            </div>
                                        )}
                                        {uploading && (
                                            <div className="flex items-center justify-center p-2">
                                                <div className="h-5 w-5 animate-spin rounded-full border-2 border-coral border-t-transparent"></div>
                                            </div>
                                        )}
                                    </div>
                                    {formData.imageUrl && !formData.imageUrl.startsWith('http') && (
                                        <p className="text-[10px] text-ink/40 font-medium">Image saved to server: {formData.imageUrl}</p>
                                    )}
                                </div>
                            </div>
                            <div className="md:col-span-2 space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-ink/50">Address</label>
                                <textarea
                                    className="w-full rounded-2xl border-slate-200 bg-slate-50 p-3 text-sm focus:border-coral focus:ring-0"
                                    value={formData.address} rows="2"
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-ink/50">Status</label>
                                <select
                                    className="w-full rounded-2xl border-slate-200 bg-slate-50 p-3 text-sm focus:border-coral focus:ring-0"
                                    value={formData.status}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                >
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            </div>
                            <div className="md:col-span-2 flex gap-4">
                                <button type="submit" className="flex-1 rounded-2xl bg-coral py-4 font-semibold text-white shadow-lg transition hover:bg-coral-dark active:scale-[0.98]">
                                    {editingId ? 'Update Location' : 'Save Location'}
                                </button>
                                {editingId && (
                                    <button 
                                        type="button" 
                                        onClick={resetForm}
                                        className="px-8 rounded-2xl bg-slate-200 py-4 font-semibold text-ink transition hover:bg-slate-300 active:scale-[0.98]"
                                    >
                                        Cancel
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                ) : showForm ? (
                    <div className="mb-10 rounded-[32px] bg-white p-8 text-center border border-slate-100 italic text-slate-400 text-sm">
                        You do not have permission to add or edit locations.
                    </div>
                ) : null}

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {loading ? (
                        Array(3).fill(0).map((_, i) => (
                            <div key={i} className="h-64 animate-pulse rounded-[32px] bg-slate-200" />
                        ))
                    ) : locations.length > 0 ? (
                        locations.map((loc) => (
                            <div key={loc._id} className="group overflow-hidden rounded-[32px] bg-white border border-slate-100 shadow-sm transition hover:shadow-md">
                                <div className="relative h-40 w-full overflow-hidden bg-slate-100">
                                    {loc.imageUrl ? (
                                        <img 
                                            src={getImageUrl(loc.imageUrl)} 
                                            alt={loc.name} 
                                            className="h-full w-full object-cover transition duration-500 group-hover:scale-110" 
                                        />
                                    ) : (
                                        <div className="flex h-full items-center justify-center bg-gradient-to-br from-sky-100 to-indigo-50">
                                            <span className="text-4xl">🏢</span>
                                        </div>
                                    )}
                                    {canEdit ? (
                                        <button 
                                            onClick={() => handleUpdateStatus(loc._id, loc.status)}
                                            className={`absolute top-4 right-4 capitalize rounded-full px-3 py-1 text-[10px] font-bold tracking-widest backdrop-blur transition-colors ${
                                                loc.status === 'active' 
                                                ? 'bg-green-500/90 text-white hover:bg-green-600' 
                                                : 'bg-slate-500/90 text-white hover:bg-slate-600'
                                            }`}
                                        >
                                            {loc.status}
                                        </button>
                                    ) : (
                                    <span className={`absolute top-4 right-4 capitalize rounded-full px-3 py-1 text-[10px] font-bold tracking-widest backdrop-blur ${
                                        loc.status === 'active' 
                                        ? 'bg-green-500/90 text-white' 
                                        : 'bg-red-500/90 text-white'
                                    }`}>
                                        {loc.status || 'Active'}
                                    </span>
                                    )}
                                </div>
                                <div className="p-6">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h3 className="font-display text-xl text-ink">{loc.name}</h3>
                                            <p className="text-sm text-ink/60">{loc.city || 'No city specified'}</p>
                                        </div>
                                        <button
                                            onClick={() => handleToggleStatus(loc)}
                                            className={`rounded-full px-4 py-1.5 transition-all text-[10px] font-black uppercase tracking-widest ${loc.status === 'active' ? 'bg-red-50 text-red-500 hover:bg-red-500 hover:text-white' : 'bg-green-50 text-green-500 hover:bg-green-500 hover:text-white'}`}
                                            title={loc.status === 'active' ? 'Disable Location' : 'Enable Location'}
                                        >
                                            {loc.status === 'active' ? 'Disable' : 'Enable'}
                                        </button>
                                    </div>
                                    <div className="mt-4 flex items-center justify-between border-t border-slate-50 pt-4">
                                        <span className="text-xs text-ink/40 font-medium">Slug: /{loc.slug}</span>
                                        {canEdit && (
                                            <button 
                                                onClick={() => handleEdit(loc)}
                                                className="text-xs font-bold text-ocean hover:underline"
                                            >
                                                Edit Details
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="md:col-span-3 py-20 text-center">
                            <p className="text-slate-400">No locations found. Add your first gym location above.</p>
                        </div>
                    )}
                </div>
            </main>
            <Footer />
        </div>
    );
}
