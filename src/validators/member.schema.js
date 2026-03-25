import { z } from "zod";
import { idParam } from "./common.schema.js";

// ─── 팀원 목록 조회 ───────────────────────────────────────────────
export const getTaskMembersSchema = z.object({
  params: z.object({
    taskId: idParam,
  }),
});
