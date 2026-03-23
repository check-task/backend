import { z } from "zod";
import { idParam } from "./common.schema.js";

// ─── 자료(Reference) ──────────────────────────────────────────────

export const createReferenceSchema = z.object({
  params: z.object({
    taskId: idParam,
  }),
  query: z.object({
    type: z.enum(["url", "file"], {
      error: () => "type은 url 또는 file이어야 합니다.",
    }),
  }),
  body: z
    .object({
      name: z.string().trim().optional(),
      url: z.string().trim().optional(),
    })
    .optional(),
});

export const updateReferenceSchema = z.object({
  params: z.object({
    taskId: idParam,
    referenceId: idParam,
  }),
  body: z
    .object({
      name: z.string().trim().optional(),
      url: z.string().trim().optional(),
      file_url: z.string().trim().optional(),
    })
    .refine(
      (data) =>
        data.name !== undefined || data.url !== undefined || data.file_url !== undefined,
      { message: "수정할 값이 없습니다." }
    ),
});

export const deleteReferenceSchema = z.object({
  params: z.object({
    taskId: idParam,
    referenceId: idParam,
  }),
});

// ─── 커뮤니케이션 ─────────────────────────────────────────────────

export const createCommunicationSchema = z.object({
  params: z.object({
    taskId: idParam,
  }),
  body: z.object({
    name: z.string().trim().min(1, "name은 필수입니다."),
    url: z.string().trim().min(1, "url은 필수입니다."),
  }),
});

export const updateCommunicationSchema = z.object({
  params: z.object({
    taskId: idParam,
    communicationId: idParam,
  }),
  body: z
    .object({
      name: z.string().trim().optional(),
      url: z.string().trim().optional(),
    })
    .refine((data) => data.name !== undefined || data.url !== undefined, {
      message: "수정할 값이 없습니다.",
    }),
});

export const deleteCommunicationSchema = z.object({
  params: z.object({
    taskId: idParam,
    communicationId: idParam,
  }),
});

// ─── 회의록 ───────────────────────────────────────────────────────

export const createLogSchema = z.object({
  params: z.object({
    taskId: idParam,
  }),
  body: z.object({
    date: z.string({ required_error: "회의 일자(date)는 필수입니다." }).min(1),
    agenda: z.string().trim().optional().nullable(),
    conclusion: z.string().trim().optional().nullable(),
    discussion: z.string().trim().optional().nullable(),
  }),
});

export const updateLogSchema = z.object({
  params: z.object({
    taskId: idParam,
    logId: idParam,
  }),
  body: z
    .object({
      date: z.string().optional(),
      agenda: z.string().trim().optional().nullable(),
      conclusion: z.string().trim().optional().nullable(),
      discussion: z.string().trim().optional().nullable(),
    })
    .refine(
      (data) =>
        data.date !== undefined ||
        data.agenda !== undefined ||
        data.conclusion !== undefined ||
        data.discussion !== undefined,
      { message: "수정할 값이 없습니다." }
    ),
});

export const deleteLogSchema = z.object({
  params: z.object({
    taskId: idParam,
    logId: idParam,
  }),
});
