import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';
import SectionTitle from '../components/SectionTitle.jsx';
import ClassCard from '../components/ClassCard.jsx';
import LocationPicker from '../components/LocationPicker.jsx';
import api from '../api/api.js';
import { getLocationSlug, getLocationId } from '../utils/location.js';

export default function Programs() {
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAge, setSelectedAge] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [categories, setCategories] = useState([]);

  const fetchClasses = () => {
    setLoading(true);
    const locationId = getLocationId();
    api
      .get('/classes', { params: { locationId } })
      .then((res) => {
        const slug = getLocationSlug();
        console.log(`Fetched classes for location [${slug || 'All'}]:`, res.data);
        if (Array.isArray(res.data)) {
          setClasses(res.data);
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });

    api.get('/categories?status=active&type=class')
      .then(res => setCategories(res.data || []))
      .catch(() => { });
  };

  useEffect(() => {
    fetchClasses();
    const handleChange = () => fetchClasses();
    window.addEventListener('location-change', handleChange);
    return () => window.removeEventListener('location-change', handleChange);
  }, []);

  const ageGroups = useMemo(() => {
    const groups = ['All', ...new Set(classes.map(c => c.ageGroup).filter(Boolean))];
    return groups;
  }, [classes]);

  const filteredClasses = useMemo(() => {
    return classes.filter(item => {
      const matchesSearch = item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesAge = selectedAge === 'All' || item.ageGroup === selectedAge;

      const itemCategoryId = typeof item.categoryId === 'object' ? item.categoryId?._id : item.categoryId;
      const matchesCategory = selectedCategory === 'All' || itemCategoryId === selectedCategory;

      return matchesSearch && matchesAge && matchesCategory;
    });
  }, [classes, searchTerm, selectedAge, selectedCategory]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      <main className="page-shell flex-1 py-12">
        <div className="pt-4 md:pt-8">
          <SectionTitle
            kicker="Programs"
            title="Choose a class path"
            subtitle="Browse our core classes and build a schedule that fits your child."
          />
        </div>

        {/* Filters Section */}
        <div className="mt-8 mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 rounded-[32px] bg-white border border-slate-100 shadow-sm transition-all hover:shadow-md">
          <div className="group flex-1 max-w-md relative">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-ink/30 group-focus-within:text-brand-blue transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search for classes..."
              className="w-full bg-slate-50 border-none rounded-2xl py-3 pl-12 pr-4 text-sm font-medium focus:ring-2 focus:ring-brand-blue/20 focus:bg-white transition-all outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-ink/30 uppercase tracking-widest">Age Group:</span>
              <select
                className="bg-slate-50 border-none rounded-2xl py-3 px-4 text-sm font-bold text-ink/70 focus:ring-2 focus:ring-brand-blue/20 outline-none cursor-pointer hover:bg-slate-100 transition-all"
                value={selectedAge}
                onChange={(e) => setSelectedAge(e.target.value)}
              >
                {ageGroups.map(group => (
                  <option key={group} value={group}>{group}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-ink/30 uppercase tracking-widest">Category:</span>
              <select
                className="bg-slate-50 border-none rounded-2xl py-3 px-4 text-sm font-bold text-ink/70 focus:ring-2 focus:ring-brand-blue/20 outline-none cursor-pointer hover:bg-slate-100 transition-all"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="All">All Categories</option>
                {categories.map(cat => (
                  <option key={cat._id} value={cat._id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div className="h-10 w-[1px] bg-slate-100 hidden md:block mx-2"></div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-ink/30 uppercase tracking-widest">Branch:</span>
              <LocationPicker compact />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="grid gap-6 md:grid-cols-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-80 animate-pulse bg-white border border-slate-100 rounded-[32px] shadow-sm"></div>
            ))}
          </div>
        ) : filteredClasses.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-3 animate-rise">
            {filteredClasses.map((item) => (
              <ClassCard key={item._id || item.title} item={item} />
            ))}
          </div>
        ) : (
          <div className="mt-12 py-16 text-center bg-white rounded-[48px] border border-dashed border-slate-200">
            <div className="text-4xl mb-4 grayscale opacity-30">🔍</div>
            <h3 className="font-display text-xl font-black text-ink">No matching classes</h3>
            <p className="mt-2 text-ink/50 font-medium">Try adjusting your filters or searching for something else.</p>
            <button
              onClick={() => { setSearchTerm(''); setSelectedAge('All'); setSelectedCategory('All'); }}
              className="mt-6 text-brand-blue font-bold text-sm hover:underline"
            >
              Clear all filters
            </button>
          </div>
        )}

        {/* Corporate & Group Specials Section */}
        <div className="mt-24 p-8 md:p-12 rounded-[48px] bg-ink text-white relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-brand-blue/20 to-transparent pointer-events-none"></div>
          <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-ocean rounded-full blur-[100px] opacity-20 pointer-events-none group-hover:scale-150 transition-transform duration-1000"></div>

          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-12">
            <div className="max-w-2xl">
              <span className="inline-block px-4 py-2 rounded-full bg-brand-blue text-[10px] font-black uppercase tracking-[0.2em] mb-6">Corporate & Events</span>
              <h2 className="font-display text-4xl md:text-5xl font-black mb-6 leading-tight">Bring your whole team to the <span className="text-brand-blue">Kid Fitness</span> arena!</h2>
              <p className="text-slate-400 text-lg leading-relaxed mb-8">
                Looking for a unique corporate team-building event or a large-scale group booking?
                Our specialized corporate portal allows you to register multiple staff members,
                manage consolidated billing, and select custom session blocks in one seamless transaction.
              </p>
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={() => navigate('/book?mode=corporate')}
                  className="bg-brand-blue hover:bg-brand-blue/90 text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-[0_10px_30px_rgba(40,116,252,0.3)] hover:-translate-y-1"
                >
                  Start Group Booking
                </button>
                <button className="bg-white/10 hover:bg-white/20 text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all backdrop-blur-md">
                  Download Brochure
                </button>
              </div>
            </div>

            <div className="w-full md:w-auto flex flex-col gap-4">
              {[
                { icon: "📄", title: "Consolidated Billing", desc: "One sales order, one payment." },
                { icon: "👥", title: "Bulk Registration", desc: "Add dozens of staff in minutes." },
                { icon: "🗓️", title: "Flexible Scheduling", desc: "Pick multiple dates at once." }
              ].map((feature, idx) => (
                <div key={idx} className="bg-white/5 backdrop-blur-sm p-6 rounded-3xl border border-white/10 hover:border-white/20 transition-all flex items-center gap-5 group/item">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-2xl group-hover/item:scale-110 transition-transform">{feature.icon}</div>
                  <div>
                    <h4 className="font-bold text-sm mb-1">{feature.title}</h4>
                    <p className="text-xs text-slate-500">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
