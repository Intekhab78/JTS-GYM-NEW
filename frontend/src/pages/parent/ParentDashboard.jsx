import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/Navbar.jsx';
import Footer from '../../components/Footer.jsx';
import api from '../../api/api.js';

const actions = [
  { to: '/dashboard/children', title: 'Add customer profile', desc: 'Register a new customer and set preferences.' },
  { to: '/calendar', title: 'Book from calendar', desc: 'Choose upcoming sessions and reserve seats.' },
  { to: '/dashboard/bookings', title: 'My Booking', desc: 'Complete payments to confirm classes.' },
  { to: '/dashboard/membership', title: 'Manage membership', desc: 'Upgrade or renew a plan.' },
  { to: '/dashboard/coupons', title: 'My Cash Coupons', desc: 'View and track your earned vouchers.' },
  { to: '/dashboard/reviews', title: 'My Reviews', desc: 'Manage your feedback on classes and trainers.' },
  { to: '/profile', title: 'Manage profile', desc: 'Update your personal info and security settings.' }
];

export default function ParentDashboard() {
  const [stats, setStats] = useState({
    childrenCount: 0,
    upcomingClassesCount: 0,
    membershipStatus: 'None'
  });
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const p1 = api.get('/reports/parent-summary').then(res => setStats(res.data));
    const p2 = api.get('/attendance/mine').then(res => setAttendance(res.data?.slice(0, 3) || []));
    
    Promise.all([p1, p2]).finally(() => setLoading(false));
  }, []);

  const quickStats = [
    { label: 'Customers registered', value: stats.childrenCount },
    { label: 'Upcoming classes', value: stats.upcomingClassesCount },
    { label: 'Membership status', value: stats.membershipStatus }
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      <main className="page-shell flex-1 pb-12 pt-8">
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-ocean to-coral p-8 text-white shadow-glow">
          <div className="relative z-10">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/80">Customer dashboard</p>
            <h1 className="mt-3 font-display text-3xl md:text-4xl">Welcome back</h1>
            <p className="mt-2 max-w-2xl text-sm text-white/80">
              Manage customer profiles, book classes, and track attendance in one place.
            </p>
          </div>
          <div className="pointer-events-none absolute -right-24 -top-20 h-64 w-64 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-16 left-10 h-48 w-48 rounded-full bg-white/10" />
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          {quickStats.map((stat, idx) => (
            <Link 
              key={stat.label} 
              to={idx === 0 ? '/dashboard/children' : idx === 1 ? '/dashboard/bookings' : '/dashboard/membership'}
              className="soft-card rounded-2xl p-6 transition-all hover:shadow-xl hover:-translate-y-1 group block border-2 border-transparent hover:border-brand-blue/10"
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-black text-ink/30 uppercase tracking-[0.2em]">{stat.label}</p>
                <div className="w-6 h-6 rounded-full bg-brand-blue/5 flex items-center justify-center text-[10px] text-brand-blue opacity-0 group-hover:opacity-100 transition-opacity">
                  →
                </div>
              </div>
              <p className={`text-4xl font-black text-ink leading-none ${loading ? 'animate-pulse' : ''}`}>
                {loading ? '—' : stat.value}
              </p>
              <div className="mt-5 h-1.5 w-12 rounded-full bg-brand-blue/20 group-hover:w-20 group-hover:bg-brand-blue transition-all duration-300" />
            </Link>
          ))}
        </section>

        <section className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {actions.map((action) => (
            <Link key={action.to} to={action.to} className="soft-card rounded-3xl p-6 transition hover:-translate-y-1 group">
              <h3 className="font-display text-lg">{action.title}</h3>
              <p className="mt-2 text-sm text-ink/70">{action.desc}</p>
              <div className="mt-4 flex items-center text-xs font-black uppercase tracking-widest text-brand-blue">
                <span>Manage</span>
                <svg className="h-3 w-3 ml-1 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          ))}
        </section>

        <section className="mt-10 grid gap-6 lg:grid-cols-3">
          <div className="soft-card rounded-3xl p-6">
            <h3 className="font-display text-lg">Attendance snapshot</h3>
            <p className="mt-2 text-sm text-ink/70">See check-ins and missed classes at a glance.</p>
            <div className="mt-4 space-y-3">
              {loading ? (
                Array(3).fill(0).map((_, i) => (
                  <div key={i} className="h-16 rounded-xl bg-slate-50 border border-slate-100 animate-pulse" />
                ))
              ) : attendance.length > 0 ? (
                attendance.map(record => (
                  <div key={record._id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 animate-in fade-in slide-in-from-bottom-1">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-black">
                      {record.status === 'present' ? '✔' : record.status[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-[11px] font-black text-ink">
                        {record.childId?.name || record.participantName || 'Guest Participant'}
                      </p>
                      <p className="text-[9px] font-bold text-ink/40 uppercase tracking-tighter">
                        {record.sessionId?.classId?.title} • {record.sessionId?.trainerId?.name || 'No Trainer'}
                      </p>
                      <p className="text-[8px] font-medium text-ink/20 mt-0.5">
                        {new Date(record.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(record.checkedInAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl bg-slate-50/70 p-4 text-sm text-ink/70 border border-slate-100 italic">
                  No attendance recorded yet.
                </div>
              )}
            </div>
          </div>
          <Link to="/dashboard/payments" className="soft-card rounded-3xl p-6 transition hover:-translate-y-1 group block">
            <h3 className="font-display text-lg">Payment history</h3>
            <p className="mt-2 text-sm text-ink/70">View receipts and membership renewals.</p>
            <div className="mt-4 flex items-center text-xs font-black uppercase tracking-widest text-brand-blue">
              <span>View all payments</span>
              <svg className="h-3 w-3 ml-1 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
          <div className="soft-card rounded-3xl p-6">
            <h3 className="font-display text-lg">Quick links</h3>
            <div className="mt-4 space-y-3 text-sm font-bold uppercase tracking-wider">
              <Link className="flex items-center gap-2 text-brand-blue hover:underline" to="/dashboard/children">
                <span>Manage customers</span>
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" /></svg>
              </Link>
              <Link className="flex items-center gap-2 text-brand-blue hover:underline" to="/calendar">
                <span>Book classes</span>
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" /></svg>
              </Link>
              <Link className="flex items-center gap-2 text-brand-blue hover:underline" to="/dashboard/bookings">
                <span>My Booking</span>
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" /></svg>
              </Link>
              <Link className="flex items-center gap-2 text-brand-blue hover:underline" to="/dashboard/payments">
                <span>Payment history</span>
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" /></svg>
              </Link>
              <Link className="flex items-center gap-2 text-brand-blue hover:underline" to="/dashboard/coupons">
                <span>My Cash Coupons</span>
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" /></svg>
              </Link>
              <Link className="flex items-center gap-2 text-brand-blue hover:underline" to="/dashboard/reviews">
                <span>My Reviews</span>
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" /></svg>
              </Link>
              <Link className="flex items-center gap-2 text-brand-blue hover:underline" to="/profile">
                <span>Edit Profile</span>
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" /></svg>
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}


