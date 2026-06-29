import React, { createContext, useContext, useState, useEffect } from 'react';
import { getUser } from '../utils/auth';

const BranchContext = createContext();

export const BranchProvider = ({ children }) => {
  const [selectedBranch, setSelectedBranch] = useState(localStorage.getItem('selectedBranch') || '');
  const [availableBranches, setAvailableBranches] = useState([]);
  const user = React.useMemo(() => getUser(), []);

  useEffect(() => {
    if (user) {
      // If superadmin, availableBranches will be set by the component that fetches all locations
      // For others, it's their assigned locationIds
      if (user.role !== 'superadmin') {
        const newUserBranches = user.locationIds || [];
        
        // Simple equality check to prevent infinite loop
        if (JSON.stringify(newUserBranches) !== JSON.stringify(availableBranches)) {
          setAvailableBranches(newUserBranches);
        }

        if (!selectedBranch && newUserBranches.length > 0) {
          const firstBranch = typeof newUserBranches[0] === 'string' ? newUserBranches[0] : newUserBranches[0]._id;
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
