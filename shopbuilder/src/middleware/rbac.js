const { ForbiddenError } = require('../errors/AppError');

const ROLE_HIERARCHY = {
  SUPER_ADMIN: 5,
  MERCHANT: 4,
  STAFF: 3,
  DEVELOPER: 2,
  CUSTOMER: 1,
};

/**
 * requireRole('MERCHANT') — allows MERCHANT and above
 * requireRole(['MERCHANT', 'STAFF']) — allows specific roles only
 */
function requireRole(roles) {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];

  return (req, res, next) => {
    if (!req.user) {
      return next(new ForbiddenError('Authentication required'));
    }

    const userRole = req.user.role;

    // Check if user's role is in the allowed list
    if (allowedRoles.includes(userRole)) {
      return next();
    }

    // Check hierarchy — SUPER_ADMIN can access everything
    if (userRole === 'SUPER_ADMIN') {
      return next();
    }

    return next(new ForbiddenError(`Role ${userRole} is not authorized. Required: ${allowedRoles.join(' or ')}`));
  };
}

module.exports = { requireRole };
