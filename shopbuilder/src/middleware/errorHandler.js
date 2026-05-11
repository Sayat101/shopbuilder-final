const { AppError } = require('../errors/AppError');

function errorHandler(err, req, res, next) {
  // Zod validation errors
  if (err.name === 'ZodError') {
    return res.status(422).json({
      error: 'Validation error',
      details: err.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
    });
  }

  // Prisma unique constraint violation
  if (err.code === 'P2002') {
    return res.status(409).json({
      error: 'Conflict',
      message: `${err.meta?.target?.join(', ')} already exists`,
    });
  }

  // Prisma not found
  if (err.code === 'P2025') {
    return res.status(404).json({ error: 'Not found', message: err.message });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Unauthorized', message: 'Invalid token' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Unauthorized', message: 'Token expired' });
  }

  // Operational errors (our AppError subclasses)
  if (err.isOperational) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  // Unknown errors
  console.error('Unexpected error:', err);
  res.status(500).json({ error: 'Internal server error' });
}

module.exports = errorHandler;
