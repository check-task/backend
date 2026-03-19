import { z } from "zod";

// URL params의 :id 계열 — "12" 같은 문자열을 숫자로 자동 변환
export const idParam = z.coerce
  .number({
    invalid_type_error: "숫자 ID여야 합니다.",
  })
  .int()
  .positive("양수 ID여야 합니다.");
