// 기본 커스텀 에러 클래스
export class CustomError extends Error {
  constructor(statusCode, errorCode, reason, data = null) {
    super(reason);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.reason = reason;
    this.data = data;
    this.name = this.constructor.name;
  }
}

// 400 Bad Request
export class BadRequestError extends CustomError {
  constructor(
    errorCode = "BAD_REQUEST",
    reason = "잘못된 요청입니다",
    data = null
  ) {
    super(400, errorCode, reason, data);
  }
}

// 401 Unauthorized
export class UnauthorizedError extends CustomError {
  constructor(
    errorCode = "UNAUTHORIZED",
    reason = "인증에 실패했습니다",
    data = null
  ) {
    super(401, errorCode, reason, data);
  }
}

// 403 Forbidden
export class ForbiddenError extends CustomError {
  constructor(
    errorCode = "FORBIDDEN",
    reason = "접근 권한이 없습니다",
    data = null
  ) {
    super(403, errorCode, reason, data);
  }
}

// 404 Not Found
export class NotFoundError extends CustomError {
  constructor(
    errorCode = "NOT_FOUND",
    reason = "리소스를 찾을 수 없습니다",
    data = null
  ) {
    super(404, errorCode, reason, data);
  }
}

// 500 Internal Server Error
export class InternalServerError extends CustomError {
  constructor(
    errorCode = "INTERNAL_SERVER_ERROR",
    reason = "서버 내부 오류가 발생했습니다",
    data = null
  ) {
    super(500, errorCode, reason, data);
  }
}
