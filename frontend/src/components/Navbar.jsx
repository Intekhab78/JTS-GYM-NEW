import { getImageUrl  } from '../api/api.js';
import { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { getUser, clearAuth, getRoleSlug } from '../utils/auth.js';
import { useAuth } from '../context/AuthContext.jsx';
import LocationSelect from './LocationSelect.jsx';
import api from '../api/api.js';

const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About' },
  { to: '/programs', label: 'Programs' },
  { to: '/pricing', label: 'Membership' },
  { to: '/schedule', label: 'Schedule' },
  { to: '/gallery', label: 'Gallery' },
  { to: '/help', label: 'Help' },
  { to: '/contact', label: 'Contact' }
];

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getRoleLabel(user) {
  if (!user) return null;
  if (user.role === 'superadmin' || user.role === 'admin') return 'Admin';
  if (user.permissions && user.permissions.length > 0) return user.role;
  if (user.role === 'trainer') return 'Trainer';
  return 'User';
}

function getRoleColor(role) {
  return { bg: '#1a6bff', text: '#fff' };
}

export default function Navbar({ className = '' }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef(null);
  const [companyInfo, setCompanyInfo] = useState({ name: 'JTS Booking', logoUrl: '' });
  const [isUATGlobal, setIsUATGlobal] = useState(true);

  useEffect(() => {
    api.get('/settings/global')
      .then(res => {
        const companySetting = res.data.find(s => s.key === 'company_info');
        if (companySetting && companySetting.value) {
          setCompanyInfo(companySetting.value);
        }

        const uatSetting = res.data.find(s => s.key === 'is_uat_enabled');
        const isEnabled = uatSetting ? !!uatSetting.value : true; // Default true for now if not set
        setIsUATGlobal(isEnabled);

        // If UAT is disabled globally but local mode is UAT, force Live
        if (!isEnabled && localStorage.getItem('systemMode') === 'uat') {
          localStorage.setItem('systemMode', 'live');
          window.location.reload();
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    setIsMobileMenuOpen(false);
    setIsProfileOpen(false);
    navigate('/');
  };

  const closeMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const isStaff = user && (user.role === 'admin' || user.role === 'superadmin' || (user.permissions && user.permissions.length > 0));
  const showLocationSelect = user && (isStaff || (user.role && user.role.toLowerCase() === 'trainer'));
  const roleLabel = getRoleLabel(user);
  const initials = user ? getInitials(user.name) : null;
  const dashboardPath = user ? `/${getRoleSlug(user.role)}` : '/login';

  const brandMark = companyInfo.name === 'JTS Booking' ? 'JTS' : companyInfo.name.substring(0, 3).toUpperCase();
  const logoSrc = companyInfo.logoUrl ? (
    getImageUrl(companyInfo.logoUrl)
  ) : null;

  return (
    <>
      <header className={`site-header sticky top-0 z-50 bg-white/90 backdrop-blur-md shadow-sm ${className}`}>
        <div className="page-shell flex items-center justify-between py-3 relative z-20">
          <NavLink to="/" onClick={closeMenu} className="flex items-center gap-3 group">
            {logoSrc ? (
              <img src={logoSrc} className="h-10 w-auto object-contain rounded-xl group-hover:scale-105 transition-transform" alt={companyInfo.name} />
            ) : (
              <span className="brand-mark group-hover:scale-110 transition-transform">{brandMark}</span>
            )}
            <span className="font-display text-2xl font-black tracking-tight text-brand-blue hidden sm:block">{companyInfo.name}</span>
            <span className="font-display text-xl font-black tracking-tight text-brand-blue sm:hidden">{companyInfo.name}</span>
          </NavLink>

          <nav className="pill-nav hidden xl:flex items-center gap-6 rounded-full px-8 py-3 text-sm font-bold border border-brand-navy/5">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `nav-link transition-colors ${isActive ? 'nav-link-active !text-brand-black' : 'text-brand-black/60 hover:text-brand-black'}`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="hidden xl:flex items-center gap-3">
             {user && isUATGlobal && (user.allowUAT || user.role === 'superadmin') && (
               <div className="flex items-center bg-slate-100 rounded-full p-1 border border-brand-navy/5 mr-2">
                 <button
                   onClick={() => {
                     localStorage.setItem('systemMode', 'live');
                     window.location.reload();
                   }}
                   className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                     (localStorage.getItem('systemMode') || 'live') === 'live'
                       ? 'bg-white text-brand-blue shadow-sm'
                       : 'text-ink/40 hover:text-ink'
                   }`}
                 >
                   Live
                 </button>
                 <button
                   onClick={() => {
                     localStorage.setItem('systemMode', 'uat');
                     window.location.reload();
                   }}
                   className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                     localStorage.getItem('systemMode') === 'uat'
                       ? 'bg-amber-500 text-white shadow-sm'
                       : 'text-ink/40 hover:text-ink'
                   }`}
                 >
                   UAT
                 </button>
               </div>
             )}
             {showLocationSelect && <LocationSelect />}
             {user ? (
                <div className="relative" ref={profileRef}>
                  <button 
                    onClick={() => {
                      setIsProfileOpen(!isProfileOpen);
                    }}
                    className="flex items-center gap-3 hover:opacity-80 transition-opacity focus:outline-none"
                    aria-label="User menu"
                  >
                    <div className="h-10 w-10 rounded-full bg-brand-blue text-white flex items-center justify-center font-black text-sm shadow-sm overflow-hidden border-2 border-white">
                      {user.avatarUrl ? (
                        <img 
                          src={getImageUrl(user.avatarUrl)} 
                          alt={user.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        initials
                      )}
                    </div>
                    <div className="text-left hidden lg:flex items-center gap-2">
                      <div>
                        <p className="text-xs font-black text-ink leading-none">{user.name.split(' ')[0]}</p>
                        <p className="text-[9px] font-black text-brand-blue uppercase tracking-[0.2em] mt-0.5">{roleLabel}</p>
                      </div>
                      <svg className={`w-3 h-3 text-ink/20 transition-transform duration-300 ${isProfileOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>

                  {isProfileOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 py-1 overflow-hidden animate-fadeIn z-50">
                       <NavLink to={dashboardPath} className="block px-4 py-3 text-[11px] font-black text-ink uppercase tracking-widest hover:bg-slate-50 transition-colors">
                          Dashboard
                       </NavLink>
                       <NavLink to="/profile" className="block px-4 py-3 text-[11px] font-black text-ink uppercase tracking-widest hover:bg-slate-50 transition-colors">
                          My Profile
                       </NavLink>
                       <div className="h-px bg-slate-50 mx-2" />
                       <button 
                         onClick={handleLogout}
                         className="w-full text-left px-4 py-3 text-[11px] font-black text-rose-500 uppercase tracking-widest hover:bg-rose-50 transition-colors"
                       >
                          Logout
                       </button>
                    </div>
                  )}
                </div>
             ) : (
                <NavLink to="/login" className="bg-brand-blue text-white px-8 py-3 rounded-full text-sm font-bold shadow-lg shadow-brand-blue/20 hover:scale-105 active:scale-95 transition-all">
                  Sign In
                </NavLink>
             )}
             <NavLink to="/booking" className="bg-brand-blue text-white px-8 py-3 rounded-full text-sm font-bold shadow-lg shadow-brand-blue/20 hover:scale-105 active:scale-95 transition-all">
                Book Trial
             </NavLink>
          </div>

          {/* Mobile Top Right Icons */}
          <div className="flex xl:hidden items-center gap-2">
            {showLocationSelect && (
              <div className="scale-90 origin-right">
                <LocationSelect />
              </div>
            )}
            {user ? (
               <NavLink to={dashboardPath} className="h-10 w-10 rounded-full bg-brand-blue/10 flex items-center justify-center text-brand-blue shadow-sm">
                 {user.avatarUrl ? (
                    <img 
                      src={getImageUrl(user.avatarUrl)} 
                      alt={user.name}
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    <span className="text-xs font-black">{initials}</span>
                  )}
               </NavLink>
            ) : (
               <NavLink to="/login" className="text-[10px] font-black uppercase tracking-widest text-brand-blue bg-brand-blue/10 px-4 py-2 rounded-full">Sign In</NavLink>
            )}
          </div>
        </div>
      </header>

      {/* Mobile "More" Drawer */}
        {isMobileMenuOpen && (
          <div className="xl:hidden fixed inset-0 z-[60] bg-white flex flex-col animate-in slide-in-from-bottom-8 duration-300 pb-20">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 shadow-sm z-10">
               <span className="font-display text-2xl font-black text-brand-blue">Menu</span>
               <button onClick={closeMenu} className="p-2 bg-slate-50 rounded-full text-slate-400 hover:text-ink">
                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
               </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-2">
               {navLinks.filter(l => !['/', '/programs', '/schedule', '/pricing'].includes(l.to)).map((link) => (
                 <NavLink 
                   key={link.to} 
                   to={link.to} 
                   onClick={closeMenu}
                   className="text-lg font-bold text-ink hover:text-brand-blue transition-colors px-4 py-4 rounded-2xl hover:bg-slate-50"
                 >
                   {link.label}
                 </NavLink>
               ))}
               <NavLink to="/booking" onClick={closeMenu} className="text-lg font-bold text-brand-blue px-4 py-4 rounded-2xl bg-brand-blue/5 mt-4">
                 Book Trial
               </NavLink>

               {user && isUATGlobal && (user.allowUAT || user.role === 'superadmin') && (
                 <div className="mt-8 px-4 py-4 bg-slate-50 rounded-3xl">
                   <p className="text-[10px] font-black text-ink/40 uppercase tracking-widest mb-3">Environment Mode</p>
                   <div className="flex items-center bg-white rounded-2xl p-1 border border-slate-100 shadow-sm">
                     <button
                       onClick={() => {
                         localStorage.setItem('systemMode', 'live');
                         window.location.reload();
                       }}
                       className={`flex-1 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                         (localStorage.getItem('systemMode') || 'live') === 'live'
                           ? 'bg-brand-blue text-white shadow-sm'
                           : 'text-ink/40'
                       }`}
                     >
                       Live
                     </button>
                     <button
                       onClick={() => {
                         localStorage.setItem('systemMode', 'uat');
                         window.location.reload();
                       }}
                       className={`flex-1 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                         localStorage.getItem('systemMode') === 'uat'
                           ? 'bg-amber-500 text-white shadow-sm'
                           : 'text-ink/40'
                       }`}
                     >
                       UAT
                     </button>
                   </div>
                 </div>
               )}
               {user && (
                 <div className="mt-8 border-t border-slate-100 pt-6 flex flex-col gap-2">
                   <p className="text-[10px] font-black text-ink/40 uppercase tracking-widest px-4 mb-2">My Account</p>
                   <NavLink to={dashboardPath} onClick={closeMenu} className="text-lg font-bold text-ink hover:text-brand-blue transition-colors px-4 py-4 rounded-2xl hover:bg-slate-50">Dashboard</NavLink>
                   <NavLink to="/profile" onClick={closeMenu} className="text-lg font-bold text-ink hover:text-brand-blue transition-colors px-4 py-4 rounded-2xl hover:bg-slate-50">My Profile</NavLink>
                   <button onClick={handleLogout} className="text-lg font-bold text-rose-500 px-4 py-4 text-left rounded-2xl hover:bg-rose-50 transition-colors">Logout</button>
                 </div>
               )}
            </div>
          </div>
        )}

        {/* Mobile Bottom Navigation */}
        <div className="xl:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-100 flex justify-around items-center h-[72px] pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
          <NavLink to="/" onClick={closeMenu} className={({isActive}) => `flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive ? 'text-brand-blue' : 'text-slate-400'}`}>
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
             <span className="text-[9px] font-black uppercase tracking-widest">Home</span>
          </NavLink>
          <NavLink to="/programs" onClick={closeMenu} className={({isActive}) => `flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive ? 'text-brand-blue' : 'text-slate-400'}`}>
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" /></svg>
             <span className="text-[9px] font-black uppercase tracking-widest">Programs</span>
          </NavLink>
          <NavLink to="/schedule" onClick={closeMenu} className={({isActive}) => `flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive ? 'text-brand-blue' : 'text-slate-400'}`}>
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
             <span className="text-[9px] font-black uppercase tracking-widest">Schedule</span>
          </NavLink>
          <NavLink to="/pricing" onClick={closeMenu} className={({isActive}) => `flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive ? 'text-brand-blue' : 'text-slate-400'}`}>
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>
             <span className="text-[9px] font-black uppercase tracking-widest">Members</span>
          </NavLink>
          <button onClick={() => setIsMobileMenuOpen(true)} className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isMobileMenuOpen ? 'text-brand-blue' : 'text-slate-400'}`}>
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
             <span className="text-[9px] font-black uppercase tracking-widest">More</span>
          </button>
        </div>
      <style>{`
        @media (max-width: 1279px) {
          body {
            padding-bottom: 72px;
          }
        }
      `}</style>
    </>
  );
}
