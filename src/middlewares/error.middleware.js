import multer from "multer";

export const errorHandler = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const errors = {
      LIMIT_FILE_SIZE: [413, "FILE_TOO_LARGE", "업로드할 수 있는 파일 크기를 초과했습니다."],
      LIMIT_FILE_COUNT: [400, "TOO_MANY_FILES", "업로드할 수 있는 파일 개수를 초과했습니다."],
      LIMIT_UNEXPECTED_FILE: [400, "UNEXPECTED_FILE", "허용되지 않은 파일 필드이거나 파일 개수를 초과했습니다."],
    };
    const [status, errorCode, reason] = errors[err.code] ??
      [400, "INVALID_UPLOAD", "파일 업로드 요청이 올바르지 않습니다."];

    return res.status(status).json({
      resultType: "FAIL", code: status, errorCode, reason,
      data: { field: err.field ?? null },
    });
  }
  const statusCode = err.statusCode || 500;

  res.status(statusCode).json({
    resultType: "FAIL",
    code: statusCode,
    errorCode: err.errorCode || "INTERNAL_SERVER_ERROR",
    reason: err.reason || err.message || "서버 내부 오류가 발생했습니다",
    data: err.data || null,
  });
};
