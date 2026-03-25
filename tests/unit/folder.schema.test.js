import { describe, it, expect } from "vitest";
import {
  createFolderSchema,
  updateFolderSchema,
  deleteFolderSchema,
} from "../../src/validators/folder.schema.js";

describe("createFolderSchema", () => {
  it("정상 요청을 통과시킨다", () => {
    const result = createFolderSchema.safeParse({
      body: { folderTitle: "내 폴더", color: "#FF5733" },
    });
    expect(result.success).toBe(true);
  });

  it("color가 잘못된 Hex면 실패하고 메시지에 Hex가 포함된다", () => {
    const result = createFolderSchema.safeParse({
      body: { folderTitle: "폴더", color: "red" },
    });
    expect(result.success).toBe(false);
    const msg = result.error.issues[0].message;
    expect(msg).toContain("Hex");
  });

  it("color에 # 없으면 실패한다", () => {
    const result = createFolderSchema.safeParse({
      body: { folderTitle: "폴더", color: "FF5733" },
    });
    expect(result.success).toBe(false);
  });

  it("folderTitle이 없으면 실패한다", () => {
    const result = createFolderSchema.safeParse({
      body: { color: "#FF5733" },
    });
    expect(result.success).toBe(false);
  });

  it("color가 없으면 실패한다", () => {
    const result = createFolderSchema.safeParse({
      body: { folderTitle: "폴더" },
    });
    expect(result.success).toBe(false);
  });
});

describe("updateFolderSchema", () => {
  it("folderTitle만 있어도 통과한다", () => {
    const result = updateFolderSchema.safeParse({
      params: { folderId: "1" },
      body: { folderTitle: "새 이름" },
    });
    expect(result.success).toBe(true);
    expect(result.data.params.folderId).toBe(1);
  });

  it("color만 있어도 통과한다", () => {
    const result = updateFolderSchema.safeParse({
      params: { folderId: "1" },
      body: { color: "#123456" },
    });
    expect(result.success).toBe(true);
  });

  it("body가 비어있으면 실패한다", () => {
    const result = updateFolderSchema.safeParse({
      params: { folderId: "1" },
      body: {},
    });
    expect(result.success).toBe(false);
  });

  it("folderId가 0이면 실패한다", () => {
    const result = updateFolderSchema.safeParse({
      params: { folderId: "0" },
      body: { folderTitle: "이름" },
    });
    expect(result.success).toBe(false);
  });

  it("folderId가 비숫자면 실패한다", () => {
    const result = updateFolderSchema.safeParse({
      params: { folderId: "abc" },
      body: { folderTitle: "이름" },
    });
    expect(result.success).toBe(false);
  });
});

describe("deleteFolderSchema", () => {
  it("정상 folderId를 숫자로 변환해 통과시킨다", () => {
    const result = deleteFolderSchema.safeParse({
      params: { folderId: "3" },
    });
    expect(result.success).toBe(true);
    expect(result.data.params.folderId).toBe(3);
  });

  it("folderId가 0이면 실패한다", () => {
    const result = deleteFolderSchema.safeParse({
      params: { folderId: "0" },
    });
    expect(result.success).toBe(false);
  });

  it("folderId가 비숫자면 실패한다", () => {
    const result = deleteFolderSchema.safeParse({
      params: { folderId: "abc" },
    });
    expect(result.success).toBe(false);
  });
});
