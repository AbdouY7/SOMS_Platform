// src/middleware/resolveCompanyScope.js
/**
 * resolveCompanyScope (= scope_company_get in the spec):
 * Sets req.companyId = req.user.companyId.
 *
 * Any companyId in body/query/params is IGNORED for company-scoped roles.
 * Super admin has companyId = null (they access all companies via explicit param).
 *
 * Must be used AFTER requireAuth.
 */
export function resolveCompanyScope(req, _res, next) {
  req.companyId = req.user?.companyId ?? null;
  next();
}
