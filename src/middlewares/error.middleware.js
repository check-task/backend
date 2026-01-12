export const errorHandler = (err, req, res, next) => {
  res.status(err.statusCode || 500).json({
    errorCode: err.errorCode || "INTERNAL_SERVER_ERROR",
    reason: err.reason || err.message || "서버 내부 오류가 발생했습니다",
    data: err.data || null,
  });
};
