export const errorHandler = (err, req, res, next) => {
  res.status(err.statusCode || 500).json({
    errorCode: err.errorCode,
    reason: err.reason || err.message || null,
    data: err.data || null,
  });
};
