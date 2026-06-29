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
                      console.log('Profile clicked', !isProfileOpen);
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

          <button 
            className="xl:hidden h-10 w-10 flex items-center justify-center bg-slate-100 rounded-xl"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <div className={`hamburger ${isMobileMenuOpen ? 'active' : ''}`}>
              <span className="block w-6 h-0.5 bg-ink mb-1 transition-all"></span>
              <span className="block w-6 h-0.5 bg-ink mb-1 transition-all"></span>
              <span className="block w-6 h-0.5 bg-ink transition-all"></span>
            </div>
          </button>
        </div>

        {isMobileMenuOpen && (
          <div className="xl:hidden bg-white border-t border-slate-50 animate-in slide-in-from-top-4 duration-300 max-h-[calc(100vh-80px)] overflow-y-auto">
            <div className="page-shell py-8 flex flex-col gap-4">
              {navLinks.map((link) => (
                <NavLink 
                  key={link.to} 
                  to={link.to} 
                  onClick={closeMenu}
                  className="text-lg font-bold text-ink hover:text-brand-blue transition-colors px-4 py-2 rounded-2xl hover:bg-slate-50"
                >
                  {link.label}
                </NavLink>
              ))}
              <div className="h-px bg-slate-100 my-2" />
              {user && isUATGlobal && (user.allowUAT || user.role === 'superadmin') && (
                <div className="px-4 py-2">
                  <p className="text-[10px] font-black text-ink/40 uppercase tracking-widest mb-2">Environment Mode</p>
                  <div className="flex items-center bg-slate-100 rounded-2xl p-1 border border-brand-navy/5">
                    <button
                      onClick={() => {
                        localStorage.setItem('systemMode', 'live');
                        window.location.reload();
                      }}
                      className={`flex-1 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                        (localStorage.getItem('systemMode') || 'live') === 'live'
                          ? 'bg-white text-brand-blue shadow-sm'
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
              {showLocationSelect && <LocationSelect />}
              {user ? (
                <>
                   <NavLink to={dashboardPath} onClick={closeMenu} className="text-lg font-bold text-brand-blue px-4">Dashboard</NavLink>
                   <button onClick={handleLogout} className="text-lg font-bold text-rose-500 px-4 text-left">Logout</button>
                </>
              ) : (
                <NavLink to="/login" onClick={closeMenu} className="text-lg font-bold text-brand-blue px-4">Sign In</NavLink>
              )}
            </div>
          </div>
        )}
      </header>
    </>
  );
}
