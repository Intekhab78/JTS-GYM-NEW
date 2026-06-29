import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import Navbar from '../../components/Navbar.jsx';
import AdminHeader from '../../components/AdminHeader.jsx';
import Footer from '../../components/Footer.jsx';
import api from '../../api/api.js';
import { usePermissions } from '../../hooks/usePermissions.js';
import { BASE_URL } from '../../api/api.js';
import { useShift } from '../../context/ShiftContext.jsx';

export default function AdminDashboard() {
  const { roleSlug } = useParams();
  const base = `/${roleSlug}`;

  const adminActions = [
    { to: `${base}/walking-booking`, title: 'Walking Booking', desc: 'Book for walk-in customers.', perm: 'bookings:view' },
    { to: `${base}/classes`, title: 'Classes', desc: 'Create and update programs.', perm: 'classes:view' },
    { to: `${base}/sessions`, title: 'Session calendar', desc: 'Schedule classes and copy QR tokens.', perm: 'sessions:view' },
    { to: `${base}/trainers`, title: 'Trainers', desc: 'Manage coach profiles and status.', perm: 'trainers:view' },
    { to: `${base}/trainers/payroll`, title: 'Trainer Payroll', desc: 'View earnings for trainers.', perm: 'trainers:view' },
    { to: `${base}/pricing`, title: 'Add Membership', desc: 'Update plan pricing and benefits.', perm: 'pricing:view' },
    { to: `${base}/bookings`, title: 'Bookings', desc: 'Approve or cancel class requests.', perm: 'bookings:view' },
    { to: `${base}/users`, title: 'Users', desc: 'Update roles and manage accounts.', perm: 'users:view' },
    { to: `${base}/roles`, title: 'Role Master', desc: 'Define granular CRUD permissions.', perm: 'roles:view' },
    { to: `${base}/promotions`, title: 'Promotions', desc: 'Create and manage discount campaigns.', perm: 'promotions:view' },
    { to: `${base}/trials`, title: 'Trial requests', desc: 'Follow up with new leads.', perm: 'trials:view' },
    { to: `${base}/leads`, title: 'General Inquiries', desc: 'View messages from the contact form.', perm: 'trials:view' },
    { to: `${base}/attendance`, title: 'Attendance', desc: 'Track and verify member attendance.', perm: 'attendance:view' },
    { to: `${base}/payments`, title: 'Payments', desc: 'Monitor transactions and exports.', perm: 'payments:view' },
    { to: `${base}/locations`, title: 'Locations', desc: 'Add or remove gym branches.', perm: 'locations:view' },
    { to: `${base}/specialties`, title: 'Specialty Master', desc: 'Manage trainer expertise areas.', perm: 'specialties:view' },
    { to: `${base}/categories`, title: 'Category Master', desc: 'Manage categories for classes and plans.', perm: 'specialties:view' },
    { to: `${base}/reports`, title: 'Reports', desc: 'View detailed activity & export Excel.', perm: 'reports:view' },
    { to: `${base}/reviews`, title: 'Reviews', desc: 'Manage and view customer reviews.', perm: 'reports:view' },
    { to: `${base}/shifts`, title: 'Shift Management', desc: 'Track cashier drawers and discrepancies.', perm: 'shifts:view' },
    { to: `${base}/vendors`, title: 'Vendor Master', desc: 'Manage third-party resellers.', perm: 'vendors:view' },
    { to: `${base}/vendors/sales`, title: 'Vendor Sales', desc: 'Report on reseller sales and margins.', perm: 'reports:view' },
    { to: `${base}/profit-loss`, title: 'Profit & Loss', desc: 'Analyze sales, expenses and net profit.', perm: 'profit_loss:view' },
    { to: `${base}/sales-dashboard`, title: 'Sales Dashboard', desc: 'Real-time sales, revenue trends, and metrics.', perm: 'profit_loss:view' },
    { to: `${base}/settings`, title: 'Company Setup', desc: 'Manage company name, footer info, and invoice numbering.', perm: 'settings:edit' },
    { to: `${base}/taxes`, title: 'Tax Master', desc: 'Manage VAT and local tax rules location-wise.', perm: 'settings:view' },
    { to: `${base}/vouchers`, title: 'Vouchers', desc: 'Generate and print gift or promo vouchers.', perm: 'promotions:view' },
    { to: `${base}/cms`, title: 'Page Builder (CMS)', desc: 'Design website sections visually.', perm: 'settings:view' },
    { to: `${base}/extensions`, title: 'Extension requests', desc: 'Handle missed session reschedule or duration extensions.', perm: 'memberships:view' },
    { to: `${base}/expenses`, title: 'Expense Management', desc: 'Track salaries, equipment, and other expenses.', perm: 'expenses:view' },
    { to: `${base}/aborted-bookings`, title: 'Aborted Bookings', desc: 'View voided, cancelled, and discarded bookings.', perm: 'reports:view' },
    { to: `${base}/uat`, title: 'UAT Management', desc: 'Isolate test data and promote configs to Live.', role: 'superadmin' }
  ];

  const [stats, setStats] = useState({
    memberships: { active: 0 },
    upcomingSessions: 0,
    bookings: { pending: 0 }
  });
  const [notifications, setNotifications] = useState({
    bookings: 0,
    trials: 0,
    leads: 0,
    extensions: 0,
    payments: 0
  });
  const [loading, setLoading] = useState(true);

  const { can, isAdminOrSuper, user } = usePermissions();
  const permissions = user?.permissions || [];
  
  const { isShiftClosed, isShiftExpired, isExempt } = useShift() || {};
  const shouldBlockActions = !isExempt && (isShiftClosed || isShiftExpired);

  useEffect(() => {
    // Socket.io initialization
    const socket = io(BASE_URL, { transports: ['polling', 'websocket'] });

    socket.on('connect', () => {
      socket.emit('join_admin');
    });

    const handleNotification = (category, data) => {
      const selectedBranchId = localStorage.getItem('selectedBranch');
      
      // Filter by location
      const isSuper = user?.role === 'superadmin';
      const isSameLocation = 
        !data.locationId || // Global notification
        isSuper || // Superadmin sees all
        (user?.locationId && data.locationId.toString() === user.locationId.toString()) || // Admin's own location
        (selectedBranchId && data.locationId.toString() === selectedBranchId.toString()); // Currently viewed branch

      if (isSameLocation) {
        setNotifications(prev => ({ ...prev, [category]: prev[category] + 1 }));
      }
    };

    socket.on('new_booking', (data) => handleNotification('bookings', data));
    socket.on('new_trial', (data) => handleNotification('trials', data));
    socket.on('new_lead', (data) => handleNotification('leads', data));
    socket.on('new_extension', (data) => handleNotification('extensions', data));
    socket.on('new_payment', (data) => handleNotification('payments', data));

    return () => socket.disconnect();
  }, []);

  useEffect(() => {
    api.get('/reports/summary')
      .then(res => {
        setStats(res.data);
        if (res.data.pendingCounts) {
          setNotifications({
            bookings: res.data.pendingCounts.bookings || 0,
            trials: res.data.pendingCounts.trials || 0,
            leads: res.data.pendingCounts.leads || 0,
            extensions: res.data.pendingCounts.extensions || 0,
            payments: res.data.pendingCounts.payments || 0
          });
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const adminStats = [
    { label: 'Confirmed bookings', value: stats.bookings?.confirmed || 0, to: `${base}/bookings`, perm: 'bookings:view' },
    { label: 'Upcoming sessions', value: stats.upcomingSessions || 0, to: `${base}/sessions`, perm: 'sessions:view' },
    { label: 'Pending bookings', value: stats.bookings?.pending || 0, to: `${base}/bookings`, perm: 'bookings:view' }
  ];

  const filteredActions = adminActions.filter(action => {
    if (action.role === 'superadmin') return user?.role === 'superadmin';
    return isAdminOrSuper || permissions.includes(action.perm);
  });
  const filteredStats = adminStats.filter(stat => isAdminOrSuper || permissions.includes(stat.perm));

  const getNotificationCount = (title) => {
    if (title === 'Bookings') return notifications.bookings;
    if (title === 'Trial requests') return notifications.trials;
    if (title === 'General Inquiries') return notifications.leads;
    if (title === 'Extension requests') return notifications.extensions;
    if (title === 'Payments') return notifications.payments;
    return 0;
  };

  return (
    <div>
      <Navbar />
      <main className="page-shell pb-12 pt-8">
        <AdminHeader 
          title="Dashboard" 
          description="Track classes, attendance, payments, and new trial leads from one command center."
        />

        {shouldBlockActions && (
          <div className={`mt-6 p-6 rounded-2xl flex items-center justify-between ${isShiftExpired ? 'bg-rose-500/10 border-rose-200' : 'bg-amber-500/10 border-amber-200'} border-2`}>
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${isShiftExpired ? 'bg-rose-500 text-white' : 'bg-amber-500 text-white'}`}>
                {isShiftExpired ? '⚠️' : '🔒'}
              </div>
              <div>
                <h3 className={`font-display text-xl ${isShiftExpired ? 'text-rose-700' : 'text-amber-700'}`}>
                  {isShiftExpired ? 'Shift Left Open From Yesterday' : 'Shift is Closed'}
                </h3>
                <p className="text-sm font-medium opacity-80 mt-1">
                  {isShiftExpired 
                    ? 'Please close yesterday\'s shift from the header above before you can perform any actions today.'
                    : 'You must open a shift to access bookings, payments, and other operational features.'}
                </p>
              </div>
            </div>
          </div>
        )}

        <section className={`mt-6 grid gap-4 md:grid-cols-3 ${shouldBlockActions ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
          {filteredStats.map((stat) => (
            <Link key={stat.label} to={stat.to} className="soft-card block rounded-2xl p-6 transition-all hover:shadow-md hover:-translate-y-1">
              <p className="text-xs font-bold text-ink/40 uppercase tracking-widest">{stat.label}</p>
              <p className={`mt-3 text-3xl font-black text-ink ${loading ? 'animate-pulse' : ''}`}>
                {loading ? '—' : stat.value}
              </p>
              <div className="mt-4 h-1 w-10 rounded-full bg-brand-blue/70" />
            </Link>
          ))}
        </section>

        <section className={`mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4 ${shouldBlockActions ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
          {filteredActions.map((action) => {
            const count = getNotificationCount(action.title);
            return (
              <Link 
                key={action.to} 
                to={action.to} 
                className="soft-card relative rounded-3xl p-6 transition hover:-translate-y-1"
                onClick={() => {
                  const categoryMap = {
                    'Bookings': 'bookings',
                    'Trial requests': 'trials',
                    'General Inquiries': 'leads',
                    'Extension requests': 'extensions',
                    'Payments': 'payments'
                  };
                  const cat = categoryMap[action.title];
                  if (cat) {
                    setNotifications(p => ({ ...p, [cat]: 0 }));
                    api.put(`/users/last-viewed/${cat}`).catch(() => {});
                  }
                }}
              >
                {count > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white shadow-lg animate-bounce">
                    {count}
                  </span>
                )}
                <h3 className="font-display text-lg">{action.title}</h3>
                <p className="mt-2 text-sm text-ink/70">{action.desc}</p>
                <span className="mt-4 inline-flex text-sm font-semibold text-coral">Open </span>
              </Link>
            );
          })}
        </section>
      </main>
      <Footer />
    </div>
  );
}
