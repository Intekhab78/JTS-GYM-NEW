import { useEffect, useState } from 'react';
import Navbar from '../../components/Navbar.jsx';
import Footer from '../../components/Footer.jsx';
import api from '../../api/api.js';

export default function MyChildren() {
  const [children, setChildren] = useState([]);
  const [form, setForm] = useState({ name: '', age: '', gender: 'other' });
  const [editingChildId, setEditingChildId] = useState(null);

  const load = () => {
    api.get('/children/mine').then((res) => setChildren(res.data || [])).catch(() => {});
  };

  useEffect(() => {
    load();
  }, []);

  const handleChange = (event) => {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const payload = { ...form, age: Number(form.age) };
    
    if (editingChildId) {
      await api.put(`/children/${editingChildId}`, payload);
      setEditingChildId(null);
    } else {
      await api.post('/children', payload);
    }
    
    setForm({ name: '', age: '', gender: 'other' });
    load();
  };

  const startEdit = (child) => {
    setEditingChildId(child._id);
    setForm({
      name: child.name,
      age: child.age,
      gender: child.gender || 'other'
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingChildId(null);
    setForm({ name: '', age: '', gender: 'other' });
  };

  return (
    <div>
      <Navbar />
      <main className="page-shell py-12">
        <h1 className="font-display text-3xl">My Customers</h1>
        <p className="mt-2 text-sm text-ink/70">Register customers, update profiles, and view milestones.</p>

        <form className="mt-6 grid gap-3 rounded-3xl bg-white/80 p-6 shadow-glow" onSubmit={handleSubmit}>
          <div className="grid gap-3 md:grid-cols-3">
            <input
              className="rounded-xl border border-orange-200/70 p-3"
              name="name"
              placeholder="Customer name"
              value={form.name}
              onChange={handleChange}
              required
            />
            <input
              className="rounded-xl border border-orange-200/70 p-3"
              name="age"
              type="number"
              placeholder="Age"
              value={form.age}
              onChange={handleChange}
              required
            />
            <select
              className="rounded-xl border border-orange-200/70 p-3"
              name="gender"
              value={form.gender}
              onChange={handleChange}
            >
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button className="flex-1 rounded-full bg-coral px-5 py-3 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98]" type="submit">
              {editingChildId ? 'Update customer profile' : 'Add customer'}
            </button>
            {editingChildId && (
              <button 
                type="button" 
                onClick={cancelEdit}
                className="rounded-full bg-slate-100 px-8 py-3 text-sm font-semibold text-ink/60 transition-colors hover:bg-slate-200"
              >
                Cancel
              </button>
            )}
          </div>
        </form>

        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {children.map((child) => (
            <div key={child._id} className="group relative flex items-center justify-between rounded-2xl bg-white/80 p-5 shadow-glow transition-all hover:bg-white hover:shadow-xl">
              <div>
                <p className="font-bold text-ink">{child.name}</p>
                <p className="text-xs text-ink/70">
                  Age {child.age} • <span className="capitalize">{child.gender}</span>
                </p>
              </div>
              <button
                onClick={() => startEdit(child)}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-500 opacity-0 transition-all group-hover:opacity-100 hover:bg-orange-100"
                title="Edit customer"
              >
                ✏️
              </button>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}

