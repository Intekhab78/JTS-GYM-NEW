import { useAuth } from '../context/AuthContext.jsx';

export function usePermissions() {
  const { user } = useAuth();
  
  // Superadmins have all permissions implicitly
  const isSuper = user?.role === 'superadmin';
  const permissions = user?.permissions || [];

  const can = (permission) => {
    if (isSuper) return true;
    return permissions.includes(permission);
  };

  return { can, user, isAdminOrSuper: isSuper };
}
