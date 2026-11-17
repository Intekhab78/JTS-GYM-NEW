import React, { createContext, useContext, useState, useEffect } from 'react';
import { getUser } from '../utils/auth';

const BranchContext = createContext();

export const BranchProvider = ({ children }) => {
  const [selectedBranch, setSelectedBranch] = useState(localStorage.getItem('selectedBranch') || '');
  const [availableBranches, setAvailableBranches] = useState([]);
  const user = React.useMemo(() => getUser(), []);

  useEffect(() => {
    if (user) {
      const isSuper = user.role === 'superadmin';
      const isStaff = user.role === 'admin' ||
        user.role === 'trainer' ||
        (user.permissions && user.permissions.length > 0) ||
        !['parent', 'customer'].includes(user.role?.toLowerCase());

      if (!isSuper && isStaff) {
        const newUserBranches = [
          ...(user.locationIds || []),
          ...(user.locationId ? [user.locationId] : [])
        ].filter(Boolean);
        
        // Simple equality check to prevent infinite loop
        if (JSON.stringify(newUserBranches) !== JSON.stringify(availableBranches)) {
          setAvailableBranches(newUserBranches);
        }

        const branchIds = newUserBranches.map(b => (typeof b === 'string' ? b : (b._id || b.id)));
        if ((!selectedBranch || !branchIds.includes(selectedBranch)) && branchIds.length > 0) {
          const firstBranch = branchIds[0];
          setSelectedBranch(firstBranch);
          localStorage.setItem('selectedBranch', firstBranch);
        }
      }
    }
  }, [user, selectedBranch, availableBranches]);

  const selectBranch = (branchId) => {
    setSelectedBranch(branchId);
    localStorage.setItem('selectedBranch', branchId);
  };

  return (
    <BranchContext.Provider value={{ selectedBranch, setSelectedBranch: selectBranch, availableBranches, setAvailableBranches }}>
      {children}
    </BranchContext.Provider>
  );
};

export const useBranch = () => {
  const context = useContext(BranchContext);
  if (!context) {
    throw new Error('useBranch must be used within a BranchProvider');
  }
  return context;
};
