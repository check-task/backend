/**
 * 마감일 미지정(endDate = null) 세부 과제의 정렬 위치 검증
 *
 * Prisma에 넘기는 orderBy에 nulls: 'last'가 포함되어야
 * 마감일 미지정 세부 과제가 목록 맨 뒤로 간다.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/db.config.js", () => {
  const prisma = {
    task: { findUnique: vi.fn(), findMany: vi.fn() },
  };
  return { prisma, default: prisma };
});

import { prisma } from "../../src/db.config.js";
import taskRepository from "../../src/repositories/task.repository.js";

describe("세부 과제 정렬 — 마감일 미지정은 맨 뒤", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.task.findUnique.mockReset();
    prisma.task.findMany.mockReset();
  });

  it("findTaskDetail: subTasks를 endDate asc + nulls last로 조회한다", async () => {
    prisma.task.findUnique.mockResolvedValue({ id: 1, subTasks: [] });

    await taskRepository.findTaskDetail(1, 1);

    const [query] = prisma.task.findUnique.mock.calls[0];
    expect(query.include.subTasks.orderBy).toEqual({
      endDate: { sort: "asc", nulls: "last" },
    });
  });

  it("findAllTasks: subTasks를 endDate asc + nulls last로 조회한다", async () => {
    prisma.task.findMany.mockResolvedValue([]);

    await taskRepository.findAllTasks({ userId: 1 });

    const [query] = prisma.task.findMany.mock.calls[0];
    expect(query.include.subTasks.orderBy).toEqual({
      endDate: { sort: "asc", nulls: "last" },
    });
  });

  it("findTaskDetail: 완료된 세부 과제는 마감일 미지정 여부와 무관하게 맨 뒤로 간다", async () => {
    prisma.task.findUnique.mockResolvedValue({
      id: 1,
      subTasks: [
        { id: 1, status: "COMPLETED", endDate: new Date(Date.UTC(2026, 0, 1)) },
        { id: 2, status: "PENDING", endDate: null },
        { id: 3, status: "PENDING", endDate: new Date(Date.UTC(2026, 0, 5)) },
      ],
    });

    const task = await taskRepository.findTaskDetail(1, 1);

    // 미완료(2, 3)가 앞, 완료(1)가 뒤 — DB 정렬 순서는 그룹 내에서 유지된다
    expect(task.subTasks.map((st) => st.id)).toEqual([2, 3, 1]);
  });
});
