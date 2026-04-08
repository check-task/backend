import { z } from "zod";
import { idParam } from "./common.schema.js";

// multipart/form-data 에서 JSON 문자열 → 배열 자동 변환
const jsonArray = (inner) =>
  z.preprocess((v) => {
    if (typeof v === "string") {
      try {
        return JSON.parse(v);
      } catch {
        return v;
      }
    }
    return v;
  }, inner);

const subTaskSchema = z.object({
  title: z.string().trim().min(1, "세부 과제 제목은 필수입니다."),
  endDate: z.string().optional(),
  status: z.enum(["PENDING", "COMPLETED"]).optional(),
  /** 해당 과제 멤버의 User.id */
  assigneeId: z.coerce.number().int().positive().optional(),
  isAlarm: z.boolean().optional(),
});

// ─── 과제 생성 ────────────────────────────────────────────────────
export const createTaskSchema = z.object({
  body: z.object({
    title: z.string().trim().min(1, "제목은 필수입니다."),
    folderId: z.coerce.number().optional().nullable(),
    deadline: z.string().optional(),
    type: z.enum(["TEAM", "PERSONAL"]).default("PERSONAL"),
    subTasks: z.array(subTaskSchema).optional().default([]),
  }),
});

// ─── 과제 목록 조회 ───────────────────────────────────────────────
export const getTasksSchema = z.object({
  query: z.object({
    type: z.enum(["TEAM", "PERSONAL"]).optional(),
    sort: z.string().optional(),
    folderId: z.coerce.number().int().positive().optional(),
    status: z.string().optional(),
  }),
});

// ─── 과제 단건 조회 / 삭제 ────────────────────────────────────────
export const taskIdParamSchema = z.object({
  params: z.object({
    taskId: idParam,
  }),
});

// ─── 과제 수정 (multipart/form-data) ─────────────────────────────
export const updateTaskSchema = z.object({
  params: z.object({
    taskId: idParam,
  }),
  body: z
    .object({
      title: z.string().trim().optional(),
      folderId: z.coerce.number().int().positive().optional(),
      deadline: z.string().optional(),
      type: z.enum(["TEAM", "PERSONAL", "팀"]).optional(),
      subTasks: jsonArray(z.array(subTaskSchema)).optional(),
    })
    .optional(),
});

// ─── 마감일 변경 ──────────────────────────────────────────────────
export const updateTaskDeadlineSchema = z.object({
  params: z.object({
    taskId: idParam,
  }),
  body: z.object({
    deadline: z
      .string({ required_error: "마감일은 필수입니다." })
      .min(1, "마감일은 빈 값일 수 없습니다."),
  }),
});

// ─── 우선순위 변경 ────────────────────────────────────────────────
export const updateTaskPrioritiesSchema = z.object({
  body: z.object({
    orderedTasks: z
      .array(
        z.object({
          taskId: z.coerce.number().int().positive(),
          rank: z.number().int().min(1),
        }),
      )
      .min(1, "orderedTasks는 최소 1개 이상이어야 합니다."),
  }),
});

// ─── 팀원 역할 변경 ───────────────────────────────────────────────
export const updateTeamMemberSchema = z.object({
  params: z.object({
    taskId: idParam,
    userId: idParam,
  }),
  body: z.object({
    role: z.union([z.literal(0), z.literal(1)], {
      error: () => "role은 0(Owner) 또는 1(Member)이어야 합니다.",
    }),
  }),
});

// ─── 팀원 삭제 ───────────────────────────────────────────────────
export const deleteTeamMemberSchema = z.object({
  params: z.object({
    taskId: idParam,
    memberId: idParam,
  }),
});

// ─── 세부 과제 추가 ───────────────────────────────────────────────
export const addSubTaskSchema = z.object({
  params: z.object({
    taskId: idParam,
  }),
  body: z.object({
    title: z.string().trim().min(1, "세부 과제 제목은 필수입니다."),
    deadline: z.string().optional(),
    isAlarm: z.boolean().optional(),
    /** 담당자 User.id (서버에서 Member.id로 변환) */
    assigneeId: z.coerce.number().int().positive().optional(),
  }),
});

// ─── 세부 Task 상태 변경 ──────────────────────────────────────────
export const updateSubTaskStatusSchema = z.object({
  params: z.object({
    subTaskId: idParam,
  }),
  body: z.object({
    status: z.enum(["PENDING", "COMPLETED"], {
      error: () => "status는 PENDING 또는 COMPLETED여야 합니다.",
    }),
  }),
});

// ─── 세부 Task 마감일 변경 ────────────────────────────────────────
export const updateSubTaskDeadlineSchema = z.object({
  params: z.object({
    subTaskId: idParam,
  }),
  body: z.object({
    endDate: z
      .string({ required_error: "마감일은 필수입니다." })
      .min(1, "마감일은 빈 값일 수 없습니다."),
  }),
});

// ─── 세부 Task 담당자 설정 ────────────────────────────────────────
export const setSubTaskAssigneeSchema = z.object({
  params: z.object({
    subTaskId: idParam,
  }),
  body: z.object({
    assigneeId: z.coerce
      .number()
      .int()
      .positive("담당자는 해당 과제 멤버의 User.id(양의 정수)여야 합니다."),
  }),
});

// ─── 초대 링크 생성 ───────────────────────────────────────────────
export const generateInviteCodeSchema = z.object({
  params: z.object({
    taskId: idParam,
  }),
});

// ─── 초대 코드로 팀 참여 ──────────────────────────────────────────
export const joinTaskSchema = z.object({
  body: z.object({
    inviteCode: z.string().trim().min(1, "초대 코드는 필수입니다."),
  }),
});

// ─── 단일 세부 과제 수정 ──────────────────────────────────────────
export const patchSubTaskSchema = z.object({
  params: z.object({
    taskId: idParam,
    subTaskId: idParam,
  }),
  body: z.object({
    title: z.string().optional(),
    /** 생성 API와 동일 키; DTO에서 endDate로 매핑 */
    deadline: z.string().optional(),
    endDate: z.string().optional(),
    isAlarm: z.boolean().optional(),
    status: z.enum(["COMPLETED", "PENDING"]).optional(),
  }),
});

// ─── 선택 세부 과제 삭제 ──────────────────────────────────────────
export const deleteSelectedSubTaskSchema = z.object({
  params: z.object({
    taskId: z.string().regex(/^\d+$/, "유효한 taskId여야 합니다."),
  }),
  body: z.object({
    subTaskIds: z
      .array(z.union([z.string().regex(/^\d+$/), z.number()]))
      .min(1, "삭제할 세부 과제를 최소 1개 이상 선택해야 합니다."),
  }),
});

// ─── 전체 세부 과제 삭제 ──────────────────────────────────────────
export const deleteAllSubTaskParamsSchema = z.object({
  params: z.object({
    taskId: z.string().regex(/^\d+$/, "유효한 taskId여야 합니다."),
  }),
});
