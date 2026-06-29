/**
 * Converts a role name string into a URL-friendly slug.
 * Example: "Store Manager" -> "store-manager"
 * @param {string} role 
 * @returns {string}
 */
export const slugifyRole = (role) => {
  if (!role) return 'admin';
  if (role.toLowerCase() === 'admin' || role.toLowerCase() === 'superadmin') return 'admin';
  return role
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};
