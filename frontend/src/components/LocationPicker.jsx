import { getImageUrl  } from '../api/api.js';
import { useEffect, useState } from 'react';
import api from '../api/api.js';
import { getSelectedLocation, setSelectedLocation } from '../utils/location.js';

export default function LocationPicker({ compact = false, allowAll = false }) {
  const [locations, setLocations] = useState([]);
  const [selected, setSelected] = useState(getSelectedLocation());

  useEffect(() => {
    api
      .get('/locations?activeClasses=true')
      .then((res) => {
        let list = res.data || [];
        const user = JSON.parse(localStorage.getItem('kfb_user') || 'null');
        const isSuper = user?.role === 'superadmin';
        const isStaff = user && (
          user.role === 'admin' ||
          user.role === 'trainer' ||
          (user.permissions && user.permissions.length > 0) ||
          !['parent', 'customer'].includes(user.role?.toLowerCase())
        );

        // If staff and not superadmin, restrict to their assigned locations
        if (user && !isSuper && isStaff) {
          const assignedIds = [
            ...(user.locationIds || []),
            ...(user.locationId ? [user.locationId] : [])
          ].filter(Boolean).map(l => (typeof l === 'string' ? l : (l._id || l.id)));

          if (assignedIds.length > 0) {
            list = list.filter(l => assignedIds.includes(l._id));
          } else {
            list = [];
          }
        }

        const options = (allowAll && isSuper) ? [{ _id: 'all', slug: 'all', name: 'All locations' }, ...list] : list;
        setLocations(options);

        // Smarter default selection / sync with allowed options
        const saved = getSelectedLocation();
        const isSavedAllowed = saved && options.some(l => l._id === saved._id);

        if (!isSavedAllowed && options.length) {
          const userLocId = typeof user?.locationId === 'string' ? user.locationId : user?.locationId?._id;
          const userLoc = userLocId ? options.find(l => l._id === userLocId) : null;
          const defaultLoc = userLoc || options[0];
          setSelected(defaultLoc);
          setSelectedLocation(defaultLoc);
          localStorage.setItem('selectedBranch', defaultLoc._id);
        } else if (isSavedAllowed) {
          setSelected(saved);
        }
      })
      .catch(() => { });
  }, [allowAll]);

  useEffect(() => {
    const handleChange = () => setSelected(getSelectedLocation());
    window.addEventListener('location-change', handleChange);
    return () => window.removeEventListener('location-change', handleChange);
  }, []);

  const handleSelect = (loc) => {
    setSelected(loc);
    setSelectedLocation(loc);
    if (loc?._id) {
      localStorage.setItem('selectedBranch', loc._id);
    }
  };

  if (!locations.length) return null;

  if (compact) {
    return (
      <div className="flex flex-nowrap sm:flex-wrap items-center gap-2 sm:gap-3 overflow-x-auto hide-scrollbar pb-1 sm:pb-0 w-full">
        {locations.map((loc) => (
          <button
            key={loc._id}
            type="button"
            onClick={() => handleSelect(loc)}
            className={`shrink-0 whitespace-nowrap rounded-full border px-3 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs font-semibold transition ${selected?._id === loc._id ? 'border-coral bg-coral/10 text-coral shadow-sm' : 'border-ink/10 text-ink/70 bg-white sm:bg-transparent'
              }`}
          >
            {loc.name}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {locations.map((loc) => (
        <button
          key={loc._id}
          type="button"
          onClick={() => handleSelect(loc)}
          className={`group overflow-hidden rounded-3xl border text-left transition hover:-translate-y-1 ${selected?._id === loc._id ? 'border-coral shadow-glow' : 'border-white/70 bg-white/70'
            }`}
        >
          <div className="h-36 w-full bg-gradient-to-r from-sky-200 via-blue-200 to-emerald-100">
            {loc.imageUrl ? (
              <img
                src={getImageUrl(loc.imageUrl)}
                alt={loc.name}
                className="h-full w-full object-cover"
              />
            ) : null}
          </div>
          <div className="p-4">
            <p className="text-sm font-semibold text-ink">{loc.name}</p>
            <p className="text-xs text-ink/60">{loc.city || 'Location'} {loc.isOnline ? '· Online' : ''}</p>
          </div>
        </button>
      ))}
    </div>
  );
}
