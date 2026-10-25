// src/services/permissions.js
// Single source of truth for the role permission matrix.
// UX guards on the frontend mirror this, but only the server enforces it.

const PERMISSIONS = {
  // super_admin
  'super_admin:manage_companies':       ['super_admin'],
  'super_admin:manage_requests':        ['super_admin'],
  'super_admin:manage_global_settings': ['super_admin'],
  'super_admin:manage_all_users':       ['super_admin'],
  'super_admin:seed_demo':              ['super_admin'],
  'super_admin:view_all_logs':          ['super_admin'],

  // company scope
  'company:manage_own_users':  ['company_admin'],
  'company:edit_profile':      ['company_admin'],
  'company:rollback_import':   ['company_admin'],
  'company:view_own_logs':     ['company_admin'],

  // analytics / data
  'data:import':              ['company_admin', 'analyst'],
  'data:enter_posts':         ['company_admin', 'analyst'],
  'analytics:view':           ['company_admin', 'analyst', 'viewer'],
  'analytics:save_simulation': ['company_admin', 'analyst'],
  'reports:create':           ['company_admin', 'analyst'],
  'reports:view':             ['company_admin', 'analyst', 'viewer'],
  'reports:export':           ['company_admin', 'analyst', 'viewer'],
};

/**
 * Check if a user has a specific capability.
 * @param {{ role: string }} user
 * @param {string} capability
 * @returns {boolean}
 */
export function can(user, capability) {
  const allowed = PERMISSIONS[capability];
  if (!allowed) return false;
  return allowed.includes(user.role);
}

/**
 * Get flat list of capabilities for a role (used in /me response).
 */
export function getPermissions(role) {
  return Object.entries(PERMISSIONS)
    .filter(([, roles]) => roles.includes(role))
    .map(([cap]) => cap);
}
