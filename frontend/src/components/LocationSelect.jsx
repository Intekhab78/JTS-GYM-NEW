import { useEffect, useState } from 'react';
import api from '../api/api.js';
import { getSelectedLocation, setSelectedLocation } from '../utils/location.js';
import { useBranch } from '../context/BranchContext.jsx';
import { getUser } from '../utils/auth.js';

export default function LocationSelect({ allowAll = false }) {
  const { selectedBranch, setSelectedBranch, setAvailableBranches } = useBranch();
  const [locations, setLocations] = useState([]);
  const user = getUser();

  useEffect(() => {
    const loadData = async () => {
      try {
        const token = localStorage.getItem('kfb_token');
        let activeUser = user;

        if (token) {
          try {
            // 1. Fetch latest user profile to sync permissions (crucial for staff)
            const meRes = await api.get('/auth/me');
            activeUser = meRes.data;
            if (activeUser) {
              const localUser = JSON.parse(localStorage.getItem('kfb_user') || '{}');
              localStorage.setItem('kfb_user', JSON.stringify({ ...localUser, ...activeUser }));
            }
          } catch (meErr) {
            console.warn("Failed to sync user profile", meErr);
            // If this fails (e.g. 401), we just use the local user or treat as guest
          }
        }

        // 2. Fetch all locations
        const locRes = await api.get('/locations?all=true');
        const list = locRes.data || [];
        const isSuper = activeUser?.role === 'superadmin';
        const isStaff = activeUser && (
          activeUser.role === 'admin' ||
          activeUser.role === 'trainer' ||
          (activeUser.permissions && activeUser.permissions.length > 0) ||
          !['parent', 'customer'].includes(activeUser.role?.toLowerCase())
        );
        
        let filtered = list;

        // If logged in and not superadmin, only show assigned locations
        if (activeUser && !isSuper && isStaff) {
          const assignedIds = [
            ...(activeUser.locationIds || []),
            ...(activeUser.locationId ? [activeUser.locationId] : [])
          ].filter(Boolean).map(l => (typeof l === 'string' ? l : (l._id || l.id)));

          if (assignedIds.length > 0) {
            filtered = list.filter(l => assignedIds.includes(l._id));
          } else {
            filtered = [];
          }
        }

        // Superadmins always get the 'All locations' option
        const options = (isSuper && allowAll) ? [{ _id: 'all', slug: 'all', name: 'All locations' }, ...list] : filtered;
        
        setLocations(options);
        setAvailableBranches(options.map(o => o._id));

        // Default selection logic: ensure selectedBranch is actually inside options
        const optionIds = options.map(o => o._id);
        if ((!selectedBranch || !optionIds.includes(selectedBranch)) && options.length > 0) {
          setSelectedBranch(options[0]._id);
          setSelectedLocation(options[0]);
        }
      } catch (err) {
        console.error("Error loading location data", err);
      }
    };

    loadData();
  }, [allowAll]);


  const handleChange = (event) => {
    const locId = event.target.value;
    const loc = locations.find((item) => item._id === locId);
    if (loc) {
      setSelectedBranch(locId);
      setSelectedLocation(loc); // Keep legacy sync if needed
      // Automatically refresh the page to update all data context
      window.location.reload();
    }
  };

  if (!locations.length) return null;

  return (
    <select
      className="rounded-full border border-ink/10 bg-white/80 px-3 py-2 text-xs font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
      value={selectedBranch || ''}
      onChange={handleChange}
    >
      {locations.map((loc) => (
        <option key={loc._id} value={loc._id}>
          {loc.name}
        </option>
      ))}
    </select>
  );
}
