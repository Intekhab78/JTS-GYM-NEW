const TOKEN_KEY = 'kfb_token';
const USER_KEY = 'kfb_user';

export const getToken = () => localStorage.getItem(TOKEN_KEY);

export const getUser = () => {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  const user = JSON.parse(raw);
  // Migration: Ensure locationIds exists if not already present
  if (!user.locationIds && user.locationId) {
    user.locationIds = [user.locationId];
  } else if (!user.locationIds) {
    user.locationIds = [];
  }
  return user;
};

export const setAuth = (payload) => {
  if (payload?.token) {
    localStorage.setItem(TOKEN_KEY, payload.token);
  }
  const user = {
    _id: payload?._id,
    name: payload?.name,
    firstName: payload?.firstName,
    lastName: payload?.lastName,
    email: payload?.email,
    role: payload?.role,
    phone: payload?.phone,
    avatarUrl: payload?.avatarUrl,
    gender: payload?.gender,
    birthDate: payload?.birthDate,
    address: payload?.address,
    city: payload?.city,
    country: payload?.country,
    instagram: payload?.instagram,
    companyName: payload?.companyName,
    tradeLicenseNo: payload?.tradeLicenseNo,
    taxNumber: payload?.taxNumber,
    companyAddress: payload?.companyAddress,
    locationIds: payload?.locationIds || [],
    trainerId: payload?.trainerId,
    permissions: payload?.permissions,
    allowUAT: payload?.allowUAT,
    canManageShifts: payload?.canManageShifts
  };
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const clearAuth = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

export const getRoleSlug = (role) => {
  if (!role) return 'dashboard';
  const r = role.toLowerCase();
  if (r === 'parent' || r === 'customer') return 'dashboard';
  if (r === 'trainer') return 'trainer/dashboard';
  // Remove spaces and underscores for staff roles (e.g. "Store Manager" -> "storemanger")
  return r.replace(/[\s_]/g, '');
};
