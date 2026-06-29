const STORAGE_KEY = 'kfb_location';

export const getSelectedLocation = () => {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : null;
};

export const setSelectedLocation = (location) => {
  if (!location) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(location));
  window.dispatchEvent(new CustomEvent('location-change'));
};

export const clearSelectedLocation = () => {
  localStorage.removeItem(STORAGE_KEY);
};

export const getLocationSlug = () => {
  const location = getSelectedLocation();
  return location?.slug || null;
};

export const getLocationId = () => {
  const location = getSelectedLocation();
  return location?._id || null;
};
