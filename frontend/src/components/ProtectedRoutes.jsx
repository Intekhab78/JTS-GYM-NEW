import { Navigate, Outlet } from 'react-router-dom';
import { getRoleSlug } from '../utils/auth.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useShift } from '../context/ShiftContext.jsx';

export function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  
  if (loading) return null; // Wait for initial sync
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children || <Outlet />;
}

export const RequireTrainer = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) return null;
  
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'trainer') return <Navigate to="/dashboard" replace />;
  return children || <Outlet />;
};

export function RequireAdmin({ children }) {
  const { user, loading } = useAuth();
  
  if (loading) return null;
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  // Allow if superadmin OR admin OR has some permissions (Staff)
  const isStaff = user.role === 'superadmin' || user.role === 'admin' || (user.permissions && user.permissions.length > 0);
  
  if (!isStaff) {
    return <Navigate to="/dashboard" replace />;
  }
  return children || <Outlet />;
}

export function RequirePermission({ permission, children }) {
  const { user, loading } = useAuth();
  
  if (loading) return null;
  
  if (!user) return <Navigate to="/login" replace />;
  
  const hasPerm = user.role === 'superadmin' || user.role === 'admin' || (user.permissions && user.permissions.includes(permission));
  
  if (!hasPerm) {
    return <Navigate to={`/${getRoleSlug(user.role)}`} replace />;
  }
  return children || <Outlet />;
}

export function RequireShift({ children }) {
  const { user, loading: authLoading } = useAuth();
  const { isShiftClosed, isShiftExpired, loading: shiftLoading, isExempt } = useShift();
  
  if (authLoading || shiftLoading) return null;
  
  if (!user) return <Navigate to="/login" replace />;
  
  if (!isExempt && (isShiftClosed || isShiftExpired)) {
    // Redirect to dashboard if shift is closed or expired, so they can open/close it
    return <Navigate to={`/${getRoleSlug(user.role)}`} replace />;
  }
  
  return children || <Outlet />;
}
