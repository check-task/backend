export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;

  res.status(statusCode).json({
    resultType: "ERROR",
    code: statusCode,
    errorCode: err.errorCode || "INTERNAL_SERVER_ERROR",
    reason: err.reason || err.message || "서버 내부 오류가 발생했습니다",
    data: err.data || null,
  });
};
