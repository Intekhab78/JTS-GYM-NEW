import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext.jsx';
import { shiftApi } from '../api/shiftApi.js';

const ShiftContext = createContext();

export function useShift() {
  return useContext(ShiftContext);
}

export function ShiftProvider({ children }) {
  const { user, loading: authLoading } = useAuth();
  const [currentShift, setCurrentShift] = useState(null);
  const [loading, setLoading] = useState(true);

  const userRole = user?.role?.toLowerCase() || '';
  // Everyone except superadmin requires a shift to do operations (assuming permissions are set)
  // Superadmin is fully exempt
  const isExempt = userRole === 'superadmin';
  const hasShiftPerm = user?.permissions?.some(p => p.startsWith('shifts:'));
  const canManageShift = ['admin', 'cashier', 'store-manager'].includes(userRole) || hasShiftPerm || user?.canManageShifts || true; // Everyone can open a shift, but is it required? We'll enforce it for everyone not exempt.

  const fetchShiftStatus = async () => {
    try {
      if (user && canManageShift) {
        const shift = await shiftApi.getCurrentShift();
        setCurrentShift(shift);
      } else {
        setCurrentShift(null);
      }
    } catch (err) {
      console.error('Failed to fetch shift status', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      fetchShiftStatus();
    }
  }, [user, authLoading]);

  const isShiftClosed = !isExempt && !currentShift;
  
  // Check if shift is from yesterday
  let isShiftExpired = false;
  if (!isExempt && currentShift && currentShift.openedAt) {
    const shiftDate = new Date(currentShift.openedAt);
    const today = new Date();
    // Compare YYYY-MM-DD
    const shiftDateString = `${shiftDate.getFullYear()}-${shiftDate.getMonth()}-${shiftDate.getDate()}`;
    const todayString = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
    
    if (shiftDateString !== todayString) {
      isShiftExpired = true;
    }
  }

  const value = {
    currentShift,
    isShiftClosed,
    isShiftExpired,
    isExempt,
    canManageShift,
    loading,
    refreshShift: fetchShiftStatus
  };

  return <ShiftContext.Provider value={value}>{children}</ShiftContext.Provider>;
}
