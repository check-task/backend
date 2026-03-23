import { z } from "zod";
import { idParam } from "./common.schema.js";

const hexColor = z
  .string()
  .trim()
  .regex(/^#[0-9A-Fa-f]{6}$/, "색상은 #을 포함한 7자리 Hex 코드여야 합니다.");

// ─── 폴더 생성 ────────────────────────────────────────────────────
export const createFolderSchema = z.object({
  body: z.object({
    folderTitle: z.string().trim().min(1, "폴더 이름은 필수입니다."),
    color: hexColor,
  }),
});

// ─── 폴더 수정 ────────────────────────────────────────────────────
export const updateFolderSchema = z.object({
  params: z.object({
    folderId: idParam,
  }),
  body: z
    .object({
      folderTitle: z
        .string()
        .trim()
        .min(1, "폴더 이름은 필수입니다.")
        .optional(),
      color: hexColor.optional(),
    })
    .refine(
      (data) => data.folderTitle !== undefined || data.color !== undefined,
      {
        message: "folderTitle 또는 color 중 하나는 필수입니다.",
      },
    ),
});

// ─── 폴더 삭제 ────────────────────────────────────────────────────
export const deleteFolderSchema = z.object({
  params: z.object({
    folderId: idParam,
  }),
});
