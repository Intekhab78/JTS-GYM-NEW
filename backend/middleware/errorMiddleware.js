export function notFound(req, res, next) {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
}

export function errorHandler(err, req, res, next) {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  
  // Only log as a SERVER ERROR if it's an actual server error (500+), not a 404 Not Found
  if (statusCode >= 500) {
    console.error('[SERVER ERROR]', err);
  } else {
    // Optionally log as warning or ignore 404s to keep logs clean
    // console.warn(`[WARNING] ${statusCode}: ${err.message}`);
  }

  res.status(statusCode);
  res.json({
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? 'redacted' : err.stack
  });
}
