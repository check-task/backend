import { BadRequestError } from "../errors/custom.error.js";

export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse({
    body: req.body,
    params: req.params,
    query: req.query,
  });

  if (!result.success) {
    const issues = result.error.issues.map((issue) => ({
      field: issue.path.join("."), // "body.title", "params.taskId" 형태
      message: issue.message,
    }));

    return next(
      new BadRequestError(
        "VALIDATION_ERROR",
        "요청값이 올바르지 않습니다.",
        issues, // errorHandler의 data 필드로 내려감
      ),
    );
  }

  // Zod가 변환(coerce)한 값으로 덮어쓰기 (예: "12" -> 12)
  if (result.data.body) {
    req.body = result.data.body;
  }
  if (result.data.params) {
    req.params = result.data.params;
  }
  if (result.data.query) {
    req.query = result.data.query;
  }

  next();
};
