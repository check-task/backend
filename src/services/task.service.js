import taskRepository from "../repositories/task.repository.js";
import {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
  UnauthorizedError,
} from "../errors/custom.error.js";
import { userRepository } from "../repositories/user.repository.js";
import { TaskResponseDTO } from "../dtos/task.dto.js";
import { prisma } from "../db.config.js";
import { calculateAlarmDate } from "../utils/calculateAlarmDate.js";
import alarmRepository from "../repositories/alarm.repository.js";
import { CommentRepository } from "../repositories/comment.repository.js";

class TaskService {
  // 완료 과제 조회
  async getCompletedTasks(userId, folderIds) {
    const user = await userRepository.getUserData(userId);
    if (!user) {
      throw new NotFoundError(
        "USER_NOT_FOUND",
        "해당 사용자를 찾을 수 없습니다.",
      );
    }

    return await taskRepository.getCompletedTasks(userId, folderIds);
  }

  // 과제 목록 조회
  async getTaskList(userId, queryParams = {}) {
    let { type, folderId, sort, status } = queryParams;

    const tasks = await taskRepository.findAllTasks({
      userId,
      type,
      folderId,
      sort,
      status,
    });

    console.log("--- [DEBUG] 조회 결과 개수 ---", tasks.length);

    return tasks;
  }

  /**
   * 세부과제 담당 Member.id 결정. assigneeUserId는 User.id.
   * 없으면: 개인 과제 → 요청자(actingUserId) 멤버 행, 팀 과제 → null.
   */
  resolveSubTaskAssigneeMemberId(
    parentTask,
    members,
    assigneeUserId,
    actingUserId,
  ) {
    const memberIds = this.resolveSubTaskAssigneeMemberIds(
      parentTask,
      members,
      assigneeUserId != null ? [assigneeUserId] : undefined,
      actingUserId,
    );
    return memberIds.length > 0 ? memberIds[0] : null;
  }

  resolveSubTaskAssigneeMemberIds(
    parentTask,
    members,
    assigneeUserIds,
    actingUserId,
  ) {
    const isPersonal = parentTask.type === "PERSONAL";
    const normalizedUserIds = Array.isArray(assigneeUserIds)
      ? assigneeUserIds
          .map((id) => Number(id))
          .filter((id) => !Number.isNaN(id) && id > 0)
      : [];

    if (normalizedUserIds.length > 0) {
      const memberIds = normalizedUserIds.map((userId) => {
        const member = members.find((x) => x.userId === userId);
        if (!member) {
          throw new BadRequestError(
            "ASSIGNEE_NOT_IN_TASK",
            "해당 과제의 멤버만 담당자로 지정할 수 있습니다.",
          );
        }
        return member;
      });

      if (isPersonal) {
        const owner = members.find((mem) => mem.role === false);
        const invalidOwner = memberIds.some(
          (member) => !owner || owner.userId !== member.userId,
        );
        if (invalidOwner) {
          throw new BadRequestError(
            "ASSIGNEE_NOT_OWNER",
            "개인 과제는 과제 소유자(User)만 담당자로 지정할 수 있습니다.",
          );
        }
      }

      return memberIds.map((member) => member.id);
    }

    if (isPersonal) {
      const self = members.find((x) => x.userId === actingUserId);
      return self ? [self.id] : [];
    }

    return [];
  }

  // 과제 생성
  async registerTask(userId, data) {
    const { subTasks, references, communications, folderId, ...taskData } =
      data;

    if (!taskData.title)
      throw new BadRequestError("TASK_TITLE_REQUIRED", "과제명은 필수입니다.");

    // 과제명 길이 제한: 10자 이하
    const titleStr = String(taskData.title ?? "").trim();
    if (titleStr.length > 10) {
      throw new BadRequestError(
        "TASK_TITLE_TOO_LONG",
        "과제명은 10자 이하여야 합니다.",
      );
    }
    // 저장할 폴더 ID 결정 로직
    let targetFolderId = null;

    // folderId가 아예 없거나, null이거나, 빈 문자열인 경우 모두 "지정안함"으로 처리
    if (!data.folderId || data.folderId === "null") {
      const defaultFolder = await taskRepository.findFolderByUserIdAndName(
        userId,
        "지정안함",
      );
      if (!defaultFolder)
        throw new BadRequestError(
          "DEFAULT_FOLDER_NOT_FOUND",
          "기본 폴더가 존재하지 않습니다.",
        );
      targetFolderId = defaultFolder.id;
    } else {
      targetFolderId = Number(data.folderId);
      if (isNaN(targetFolderId))
        throw new BadRequestError(
          "INVALID_FOLDER_ID",
          "folderId는 숫자여야 합니다.",
        );

      const folderCheck = await taskRepository.findFolderById(targetFolderId);
      if (!folderCheck)
        throw new BadRequestError(
          "FOLDER_NOT_FOUND",
          "폴더가 존재하지 않습니다.",
        );
      if (folderCheck.userId !== userId)
        throw new BadRequestError("FOLDER_NOT_OWNED", "본인 폴더가 아닙니다.");
    }

    // 트랜잭션 시작
    return await prisma.$transaction(async (tx) => {
      // 과제 생성
      const newTask = await taskRepository.createTask({ ...taskData }, tx);

      // 과제 생성자를 owner로 멤버에 자동 추가
      const memberData = await taskRepository.createMember(
        userId,
        newTask.id,
        false,
        targetFolderId || null,
        tx,
      );

      // 우선 순위 지정
      const maxRank = await taskRepository.findMaxRank(userId, tx);
      await taskRepository.upsertTaskPriority(
        userId,
        newTask.id,
        maxRank + 1,
        tx,
      );

      // --- [알림 생성 로직 유지] ---
      if (newTask.isAlarm) {
        if (newTask.type === "TEAM") {
          const members = await tx.member.findMany({
            where: { taskId: newTask.id },
            include: { user: { include: { alarmSetting: true } } },
          });

          if (members.length > 0) {
            const alarmPromises = members.map(async (member) => {
              const u = member.user;
              const alarmHours = u.alarmSetting?.deadlineAlarm ?? 24;
              const alarmDate = calculateAlarmDate(
                newTask.deadline,
                alarmHours,
              );

              return alarmRepository.createTaskAlarm(
                member.userId,
                newTask.id,
                newTask.title,
                alarmDate,
                tx,
              );
            });
            await Promise.all(alarmPromises);
          }
        } else {
          const creator = await tx.user.findFirst({
            where: { id: userId },
            include: { alarmSetting: true },
          });

          if (creator) {
            const alarmHours = creator?.alarmSetting?.deadlineAlarm ?? 24;
            console.log(alarmHours);
            const alarmDate = calculateAlarmDate(newTask.deadline, alarmHours);

            await alarmRepository.createTaskAlarm(
              userId,
              newTask.id,
              newTask.title,
              alarmDate,
              tx,
            );
          }
        }
      }

      // 검사 완료
      // --- [하위 데이터 저장 로직 유지] ---
      if (subTasks && subTasks.length > 0) {
        const membersForSub = await tx.member.findMany({
          where: { taskId: newTask.id },
        });

        const resolvedSubRows = subTasks.map((st) => {
          const endDate = st.endDate;
          if (!(endDate instanceof Date) || isNaN(endDate.getTime())) {
            throw new BadRequestError(
              "SUBTASK_END_DATE_REQUIRED",
              "세부 과제 마감일이 필요합니다.",
            );
          }

          const assigneeMemberIds = this.resolveSubTaskAssigneeMemberIds(
            newTask,
            membersForSub,
            st.assigneeIds ?? (st.assigneeId != null ? [st.assigneeId] : []),
            userId,
          );

          return {
            title: st.title,
            endDate,
            status: st.status ?? "PENDING",
            isAlarm: st.isAlarm !== false,
            assigneeMemberIds,
          };
        });

        const createdSubTasksList = await Promise.all(
          resolvedSubRows.map(async (row) => {
            return await taskRepository.createSubTask(
              { ...row, taskId: newTask.id },
              tx,
            );
          }),
        );

        for (const subTask of createdSubTasksList) {
          if (!subTask.isAlarm || !subTask.subTaskAssignees?.length) {
            continue;
          }

          for (const assignment of subTask.subTaskAssignees) {
            const assignee = assignment.member;
            if (!assignee?.userId) continue;

            const alarmHours =
              assignee.user?.alarmSetting?.taskAlarm ?? 24;
            const alarmDate = calculateAlarmDate(subTask.endDate, alarmHours);

            await alarmRepository.createSubTaskAlarm(
              assignee.userId,
              subTask.taskId,
              subTask.id,
              subTask.title,
              alarmDate,
              tx,
            );
          }
        }
      }

      if (references && references.length > 0) {
        await taskRepository.addReferences(newTask.id, references, tx);
      }

      if (communications && communications.length > 0) {
        // 레포지토리에 addCommunications 함수가 있다면 호출
        await taskRepository.addCommunications(newTask.id, communications, tx);
      }

      return { taskId: newTask.id };
    });
  }

  // 과제 수정
  async modifyTask(taskId, userId, updateData) {
    // 과제 존재 여부 확인
    const currentTask = await taskRepository.findTaskById(taskId);
    if (!currentTask)
      throw new NotFoundError(
        "TASK_NOT_FOUND",
        "수정하려는 과제가 존재하지 않습니다.",
      );

    // 본인이 멤버인지 확인
    const member = await taskRepository.findMemberInTask(taskId, userId);
    if (!member) {
      throw new ForbiddenError(
        "FORBIDDEN_TASK",
        "해당 과제를 수정할 권한이 없습니다.",
      );
    }

    // PERSONAL 과제의 경우, 소유자만 수정 가능
    if (currentTask.type === "PERSONAL" && member.role !== false) {
      throw new ForbiddenError(
        "FORBIDDEN_PERSONAL_TASK",
        "개인 과제는 소유자만 수정할 수 있습니다.",
      );
    }

    if (Object.keys(updateData).length === 0) {
      throw new Error("수정할 값이 없습니다.");
    }

    // 폴더 존재 여부 확인
    if ("folderId" in updateData) {
      let targetFolderId;

      if (updateData.folderId === null) {
        const defaultFolder = await taskRepository.findFolderByUserIdAndName(
          userId,
          "지정안함",
        );
        if (!defaultFolder) throw new Error("기본 폴더가 존재하지 않습니다.");
        targetFolderId = defaultFolder.id;
      } else {
        targetFolderId = Number(updateData.folderId);
        if (isNaN(targetFolderId))
          throw new Error("folderId는 숫자여야 합니다.");

        const folderCheck = await taskRepository.findFolderById(targetFolderId);
        if (!folderCheck)
          throw new BadRequestError(
            "FOLDER_NOT_FOUND",
            "폴더가 존재하지 않습니다.",
          );
        if (folderCheck.userId !== userId)
          throw new BadRequestError(
            "FOLDER_NOT_OWNED",
            "본인 폴더가 아닙니다.",
          );
      }

      // 폴더 업데이트
      await taskRepository.updateMemberFolder({
        userId,
        taskId,
        folderId: targetFolderId,
      });

      delete updateData.folderId;
    }

    const updatedTask = await taskRepository.updateTask(taskId, updateData);
    return { taskId: updatedTask.id };
  }

  // 개인 과제 → 팀 과제 변경
  async convertTaskToTeam(taskId, userId) {
    const currentTask = await taskRepository.findTaskById(taskId);
    if (!currentTask)
      throw new NotFoundError(
        "TASK_NOT_FOUND",
        "변경하려는 과제가 존재하지 않습니다.",
      );

    const member = await taskRepository.findMemberInTask(taskId, userId);
    if (!member) {
      throw new ForbiddenError(
        "FORBIDDEN_TASK",
        "해당 과제를 변경할 권한이 없습니다.",
      );
    }

    if (currentTask.type === "TEAM") {
      throw new BadRequestError(
        "ALREADY_TEAM_TASK",
        "이미 팀 과제입니다.",
      );
    }

    // 개인 과제는 소유자만 팀 과제로 변경 가능
    if (member.role !== false) {
      throw new ForbiddenError(
        "FORBIDDEN_PERSONAL_TASK",
        "개인 과제는 소유자만 팀 과제로 변경할 수 있습니다.",
      );
    }

    const updatedTask = await taskRepository.updateTask(taskId, {
      type: "TEAM",
    });

    return { taskId: updatedTask.id, type: updatedTask.type };
  }

  // Task 마감일 변경 서비스
  async updateTaskDeadline(userId, taskId, deadline) {
    // 1. Task 존재 여부 확인
    const existingTask = await taskRepository.findTaskById(taskId);
    if (!existingTask) {
      throw new NotFoundError("TASK_NOT_FOUND", "존재하지 않는 과제입니다.");
    }

    // 2. 수정 권한 확인
    // 해당 유저가 과제의 멤버인지 확인합니다.
    const member = await taskRepository.findMemberInTask(taskId, userId);
    if (!member) {
      throw new ForbiddenError(
        "FORBIDDEN_TASK",
        "과제 마감일을 수정할 권한이 없습니다.",
      );
    }

    // PERSONAL 과제의 경우, 소유자만 수정 가능
    if (existingTask.type === "PERSONAL" && member.role !== false) {
      throw new ForbiddenError(
        "FORBIDDEN_PERSONAL_TASK",
        "개인 과제는 소유자만 수정할 수 있습니다.",
      );
    }

    // 3. 날짜 형식 유효성 검사
    const newDeadline = new Date(deadline);
    if (isNaN(newDeadline.getTime())) {
      throw new BadRequestError(
        "BAD_REQUEST",
        "유효하지 않은 날짜 형식입니다.",
      );
    }

    // 4. 세부 과제들의 마감일보다 이른 날짜로 변경 불가하도록 검증
    const subTasks = await prisma.subTask.findMany({
      where: { taskId: taskId },
    });

    for (const subTask of subTasks) {
      // Date 객체끼리 비교
      if (new Date(subTask.endDate) > newDeadline) {
        throw new BadRequestError(
          "세부 과제의 마감일보다 이른 날짜로 변경할 수 없습니다.",
        );
      }
    }

    // 5. 트랜잭션으로 Task 업데이트 및 알림 시간 재설정
    return await prisma.$transaction(async (tx) => {
      // Task 마감일 업데이트
      const updatedTask = await taskRepository.updateTask(
        taskId,
        { deadline: newDeadline },
        tx,
      );

      // 관련 알림 시간 업데이트
      await alarmRepository.updateAlarmsForTaskDeadline(
        taskId,
        newDeadline,
        tx,
      );

      return updatedTask;
    });
  }

  // 과제 세부 사항 조회
  async getTaskDetail(taskId, userId) {
    const taskDetail = await taskRepository.findTaskDetail(taskId, userId);

    if (!taskDetail) {
      throw new NotFoundError("과제를 찾을 수 없음");
    }

    // 본인이 멤버인지 확인
    const member = await taskRepository.findMemberInTask(taskId, userId);
    if (!member) {
      throw new ForbiddenError(
        "FORBIDDEN_TASK",
        "해당 과제에 접근할 권한이 없습니다.",
      );
    }

    return taskDetail;
  }

  // 우선순위 변경
  async updatePriorities(userId, orderedTasks) {
    // 각 과제에 대해 본인이 멤버인지 확인
    for (const item of orderedTasks) {
      const member = await taskRepository.findMemberInTask(item.taskId, userId);
      if (!member) {
        throw new ForbiddenError(
          "FORBIDDEN_TASK",
          "해당 과제에 접근할 권한이 없습니다.",
        );
      }
    }

    // 일괄 변경 트랜잭션 처리
    return await prisma.$transaction(async (tx) => {
      for (const item of orderedTasks) {
        await taskRepository.upsertTaskPriority(
          userId,
          item.taskId,
          item.rank,
          tx,
        );
      }
    });
  }

  // 세부 TASK 완료 처리 API
  async updateSubTaskStatus(subTaskId, status, userId) {
    try {
      // 서브태스크 존재 여부 확인
      const existingTask = await prisma.subTask.findUnique({
        where: { id: parseInt(subTaskId) },
      });

      if (!existingTask) {
        const error = new NotFoundError(
          "NOT_FOUND_SUBTASK",
          "해당하는 세부 태스크를 찾을 수 없습니다.",
        );
        error.status = 404;
        throw error;
      }

      // 본인이 멤버인지 확인
      const member = await taskRepository.findMemberInTask(
        existingTask.taskId,
        userId,
      );
      if (!member) {
        throw new ForbiddenError(
          "FORBIDDEN_TASK",
          "해당 과제에 접근할 권한이 없습니다.",
        );
      }

      // 상태 업데이트(프리지마 모델명은 대소문자 구분!)
      const updatedTask = await prisma.subTask.update({
        where: { id: parseInt(subTaskId) },
        data: {
          status: status === "COMPLETED" ? "COMPLETED" : "PENDING",
          updatedAt: new Date(),
        },
      });

      return updatedTask;
    } catch (error) {
      console.error("Error updating subtask status:", error);
      throw error;
    }
  }

  // 세부task 날짜 변경 API
  async updateSubTaskDeadline(subTaskId, deadline, userId) {
    try {
      // 서브태스크와 상위 태스크 정보 조회
      const existingTask = await prisma.subTask.findUnique({
        where: { id: parseInt(subTaskId) },
        include: {
          task: {
            select: {
              deadline: true,
            },
          },
        },
      });

      if (!existingTask) {
        const error = new Error("해당하는 세부 태스크를 찾을 수 없습니다.");
        error.statusCode = 404;
        error.errorCode = "SUBTASK_NOT_FOUND";
        throw error;
      }

      // 본인이 멤버인지 확인
      const member = await taskRepository.findMemberInTask(
        existingTask.taskId,
        userId,
      );
      if (!member) {
        throw new ForbiddenError(
          "FORBIDDEN_TASK",
          "해당 과제에 접근할 권한이 없습니다.",
        );
      }

      const newDeadline = new Date(deadline);
      const parentEndDate = new Date(existingTask.task.deadline);

      // 부모 태스크의 마감일을 초과하는지 확인
      if (newDeadline > parentEndDate) {
        const error = new Error("부모 Task의 마감일을 초과할 수 없습니다.");
        error.statusCode = 400;
        throw error;
      }

      return await prisma.$transaction(async (tx) => {
        // 마감일 업데이트
        const updatedTask = await tx.subTask.update({
          where: { id: parseInt(subTaskId) },
          data: {
            endDate: newDeadline,
            updatedAt: new Date(),
          },
        });

        await alarmRepository.updateAlarmsForSubTaskDeadline(
          parseInt(subTaskId),
          newDeadline,
          tx,
        );

        return updatedTask;
      });
    } catch (error) {
      console.error("Error updating subtask deadline:", error);
      throw error;
    }
  }

  // 세부 TASK 담당자 설정 API
  /**
   * body.assigneeId = User.id.
   * body.assigneeIds = User.id[] 배열.
   * DB는 SubTaskAssignee 조인 테이블로 여러 담당자를 관리합니다.
   */
  async setSubTaskAssignee(subTaskId, assigneeId, assigneeIds, userId) {
    console.log(
      "Service - subTaskId:",
      subTaskId,
      "assigneeId (User.id):",
      assigneeId,
      "assigneeIds:",
      assigneeIds,
    );

    try {
      const parsedSubTaskId = parseInt(subTaskId, 10);
      if (isNaN(parsedSubTaskId)) {
        const error = new Error("유효하지 않은 세부 태스크 ID입니다.");
        error.statusCode = 400;
        throw error;
      }

      const parsedAssigneeUserId =
        assigneeId != null && assigneeId !== ""
          ? parseInt(assigneeId, 10)
          : null;
      if (
        assigneeId != null &&
        assigneeId !== "" &&
        isNaN(parsedAssigneeUserId)
      ) {
        const error = new Error("유효하지 않은 담당자(User) ID입니다.");
        error.statusCode = 400;
        throw error;
      }

      const parsedAssigneeUserIds = Array.isArray(assigneeIds)
        ? assigneeIds
            .map((id) => Number(id))
            .filter((id) => !Number.isNaN(id) && id > 0)
        : [];

      const uniqueAssigneeUserIds = Array.from(
        new Set([
          ...(parsedAssigneeUserIds || []),
          ...(parsedAssigneeUserId != null ? [parsedAssigneeUserId] : []),
        ]),
      );

      if (uniqueAssigneeUserIds.length > 0) {
        const users = await prisma.user.findMany({
          where: { id: { in: uniqueAssigneeUserIds } },
          select: { id: true },
        });

        const foundIds = users.map((user) => user.id);
        const missingIds = uniqueAssigneeUserIds.filter(
          (id) => !foundIds.includes(id),
        );
        if (missingIds.length > 0) {
          const error = new Error("지정된 사용자를 찾을 수 없습니다.");
          error.statusCode = 404;
          error.errorCode = "USER_NOT_FOUND";
          throw error;
        }
      }

      const existingTask = await prisma.subTask.findUnique({
        where: { id: parsedSubTaskId },
        include: {
          task: { include: { members: true } },
          subTaskAssignees: {
            include: {
              member: {
                include: {
                  user: { include: { alarmSetting: true } },
                },
              },
            },
          },
        },
      });

      if (!existingTask) {
        const error = new Error("해당하는 세부 태스크를 찾을 수 없습니다.");
        error.statusCode = 404;
        error.errorCode = "SUBTASK_NOT_FOUND";
        throw error;
      }

      const member = await taskRepository.findMemberInTask(
        existingTask.taskId,
        userId,
      );
      if (!member) {
        throw new ForbiddenError(
          "FORBIDDEN_TASK",
          "해당 과제에 접근할 권한이 없습니다.",
        );
      }

      const task = existingTask.task;
      const isTeamTask = task.type === "TEAM";
      const previousAssigneeMemberIds =
        existingTask.subTaskAssignees?.map((assignment) => assignment.memberId) || [];
      const nextAssigneeMemberIds = uniqueAssigneeUserIds.length > 0
        ? this.resolveSubTaskAssigneeMemberIds(
            task,
            task.members,
            uniqueAssigneeUserIds,
            userId,
          )
        : [];

      if (uniqueAssigneeUserIds.length > 0 && nextAssigneeMemberIds.length === 0) {
        const error = new Error(
          "해당 과제의 멤버만 담당자로 지정할 수 있습니다.",
        );
        error.statusCode = 400;
        error.errorCode = "ASSIGNEE_NOT_IN_TASK";
        throw error;
      }

      const memberIdsChanged =
        JSON.stringify(previousAssigneeMemberIds.sort()) !==
        JSON.stringify(nextAssigneeMemberIds.sort());
      const previousNotifyUserIds = previousAssigneeMemberIds
        .map((id) => task.members.find((m) => m.id === id)?.userId ?? null)
        .filter(Boolean);

      return await prisma.$transaction(async (tx) => {
        if (memberIdsChanged && previousNotifyUserIds.length > 0) {
          for (const notifyUserId of previousNotifyUserIds) {
            await alarmRepository.deleteSubTaskAlarm(
              notifyUserId,
              parsedSubTaskId,
              tx,
            );
          }
        }

        await taskRepository.replaceSubTaskAssignees(
          parsedSubTaskId,
          nextAssigneeMemberIds,
          tx,
        );

        const updatedTask = await tx.subTask.update({
          where: { id: parsedSubTaskId },
          data: {
            updatedAt: new Date(),
          },
          include: {
            task: true,
            subTaskAssignees: {
              include: {
                member: {
                  include: {
                    user: { include: { alarmSetting: true } },
                  },
                },
              },
            },
          },
        });

        if (memberIdsChanged && updatedTask.isAlarm) {
          const newAssignments = updatedTask.subTaskAssignees || [];

          for (const assignment of newAssignments) {
            const assignee = assignment.member;
            if (!assignee?.userId) continue;

            const alarmHours = assignee.user?.alarmSetting?.taskAlarm ?? 24;
            const alarmDate = calculateAlarmDate(
              updatedTask.endDate,
              alarmHours,
            );

            await alarmRepository.createSubTaskAlarm(
              assignee.userId,
              Number(updatedTask.taskId),
              Number(updatedTask.id),
              updatedTask.title,
              alarmDate,
              tx,
            );
          }
        }

        return {
          subTaskId: updatedTask.id,
          assignees: updatedTask.subTaskAssignees.map((assignment) => ({
            memberId: assignment.member.id,
            userId: assignment.member.user.id,
            nickname: assignment.member.user.nickname,
            profileImage: assignment.member.user.profileImage || null,
          })),
          updatedAt: updatedTask.updatedAt,
        };
      });
    } catch (error) {
      console.error("Error in setSubTaskAssignee service:", {
        message: error.message,
        stack: error.stack,
        statusCode: error.statusCode,
      });

      // 상태 코드가 이미 설정된 에러는 그대로 전파
      if (error.statusCode) {
        // 404 에러의 경우 errorCode가 없으면 추가
        if (error.statusCode === 404 && !error.errorCode) {
          error.errorCode = "NOT_FOUND";
        }
        throw error;
      }

      // 그 외의 에러는 500 에러로 처리
      error.statusCode = 500;
      error.errorCode = "INTERNAL_SERVER_ERROR";
      error.message = "서버 내부 오류가 발생했습니다.";
      throw error;
    }
  }

  // 초대 코드 조회
  async checkInviteCode(taskInfo) {
    // 초대 코드 / 만료시간 없는 경우
    if (taskInfo.inviteCode == null || !taskInfo.inviteExpiredAt == null) {
      return { isValid: false };
    }

    // 만료 여부 체크
    const now = new Date();
    if (now > taskInfo.inviteExpiredAt) {
      return { isValid: false };
    }

    return {
      isValid: true,
      invite_code: taskInfo.inviteCode,
      invite_expired: taskInfo.inviteExpiredAt,
    };
  }

  // 초대 코드 생성
  async generateInviteCode(taskInfo, userId) {
    if (taskInfo.type === "PERSONAL") {
      throw new ForbiddenError(
        "PERSONAL_TASK",
        "개인 과제는 초대 코드 생성이 불가능합니다.",
      );
    }

    // 사용자가 해당 과제의 멤버인지 확인 - 모든 멤버가 초대할 수 있음
    const isMember = await prisma.member.findFirst({
      where: { taskId: taskInfo.id, userId },
    });

    if (!isMember) {
      throw new ForbiddenError(
        "NOT_MEMBER",
        "해당 과제에 참여한 멤버가 아닙니다.",
      );
    }

    // 랜덤한 8자리 초대 코드 생성 (대문자 + 숫자)
    const inviteCode = Array(8)
      .fill(0)
      .map(() => ((Math.random() * 36) | 0).toString(36).toUpperCase())
      .join("");

    const result = await prisma.$transaction(async (tx) => {
      return await taskRepository.updateTaskInviteCode(
        taskInfo.id,
        inviteCode,
        tx,
      );
    });

    return {
      invite_code: result.inviteCode,
      invite_expired: result.inviteExpiredAt,
    };
  }

  // 초대 코드로 팀 참여
  async joinTaskByInviteCode(userId, folderId, inviteCode) {
    let targetFolderId = folderId;

    if (!targetFolderId) {
      const defaultFolder = await taskRepository.findFolderByUserIdAndName(
        userId,
        "지정안함",
      );

      // "지정안함" 폴더조차 없는 경우에 대한 방어 로직
      if (!defaultFolder) {
        throw new NotFoundError(
          "DEFAULT_FOLDER_NOT_FOUND",
          "기본 폴더(지정안함)를 찾을 수 없습니다. 폴더를 먼저 생성해주세요.",
        );
      }
      targetFolderId = defaultFolder.id;
    }

    // 폴더id가 본인 것인지 확인
    const folderCheck = await taskRepository.findFolderById(targetFolderId);
    if (!folderCheck)
      throw new NotFoundError("FOLDER_NOT_FOUND", "폴더가 존재하지 않습니다.");
    if (folderCheck.userId !== userId)
      throw new ForbiddenError(
        "NOT_USER_FOLDER_CODE",
        "해당 유저의 폴더가 아닙니다.",
      );

    // 초대 코드로 과제 찾기
    const findTask = await taskRepository.findTaskByCode(inviteCode);
    if (!findTask)
      throw new NotFoundError(
        "INVALID_INVITE_CODE",
        "유효하지 않은 초대 코드입니다.",
      );
    if (findTask.inviteExpiredAt && new Date() > findTask.inviteExpiredAt)
      throw new ForbiddenError(
        "EXPIRED_INVITE_CODE",
        "만료된 초대 코드입니다.",
      );

    // 이미 멤버인지 확인
    const existingMember = await taskRepository.findMemberInTask(
      findTask.id,
      userId,
    );
    if (existingMember)
      throw new ForbiddenError("ALREADY_MEMBER", "이미 팀 멤버입니다.");

    // 트랜잭션으로 멤버 추가 및 알림 생성
    const result = await prisma.$transaction(async (tx) => {
      const newMember = await taskRepository.createMember(
        userId,
        findTask.id,
        true,
        targetFolderId,
        tx,
      );

      // 새로 참여한 유저 정보 조회 (닉네임)
      const newUser = await tx.user.findUnique({
        where: { id: userId },
        select: { nickname: true },
      });

      // 기존 팀원들에게 "새 멤버 참여" 알림 생성
      const existingMembers = await tx.member.findMany({
        where: {
          taskId: findTask.id,
          userId: { not: userId }, // 본인 제외
        },
        include: {
          user: true,
        },
        include: { user: true },
      });

      const alarmPromises = existingMembers.map((member) => {
        return alarmRepository.createMemberJoinAlarm(
          member.userId,
          findTask.id,
          findTask.title,
          newUser?.nickname || "새로운 팀원",
          tx,
        );
      });

      if (alarmPromises.length > 0) {
        await Promise.all(alarmPromises);
      }

      if (findTask.isAlarm) {
        const user = await tx.user.findUnique({
          where: { id: userId },
          include: { alarmSetting: true },
        });

        if (user) {
          const alarmHours = user.alarmSetting?.taskAlarm || 24;
          const alarmDate = calculateAlarmDate(findTask.deadline, alarmHours);

          await alarmRepository.createTaskAlarm(
            userId,
            findTask.id,
            findTask.title,
            alarmDate,
            tx,
          );
        }
      }

      return {
        taskId: findTask.id,
        taskTitle: findTask.title,
        memberId: newMember.id,
        folderId: targetFolderId,
      };
    });

    return result;
  }

  // 멤버 역할 수정
  async modifyMemberRole(taskId, actingUserId, targetUserId, role) {
    // 권한: 요청자는 해당 과제의 owner(관리자 역할 false)여야 합니다.
    const requester = await taskRepository.findMemberInTask(
      taskId,
      actingUserId,
    );
    if (!requester) {
      throw new ForbiddenError(
        "FORBIDDEN",
        "유저가 해당 과제에 권한이 없습니다.",
      );
    }
    if (requester.role !== false) {
      throw new ForbiddenError(
        "FORBIDDEN",
        "과제의 소유자(Owner)만 멤버 권한을 변경할 수 있습니다.",
      );
    }

    const member = await taskRepository.findMemberInTask(taskId, targetUserId);
    if (!member) {
      throw new NotFoundError(
        "MEMBER_NOT_FOUND",
        "해당 과제에서 해당 유저를 찾을 수 없음",
      );
    }

    const isTargetBecomingOwner = role === 0;

    return await prisma.$transaction(async (tx) => {
      if (isTargetBecomingOwner) {
        await taskRepository.resetOtherMembersRole(taskId, targetUserId, tx);
      }

      const dbRoleValue = isTargetBecomingOwner ? false : true;
      return await taskRepository.updateMemberRole(member.id, dbRoleValue, tx);
    });
  }

  // 팀원 추방
  async outMember(taskId, targetUserId, actingUserId) {
    console.log("서비스 로직 : outMember", taskId, targetUserId, actingUserId);

    const requestingUser = await taskRepository.findMemberInTask(
      taskId,
      actingUserId,
    );
    if (!requestingUser)
      throw new NotFoundError(
        "OWNER_NOT_FOUND",
        "요청한 유저가 팀에 없습니다.",
      );
    if (requestingUser.role !== false)
      throw new UnauthorizedError(
        "UNAUTHORIZED",
        "권한이 없습니다. 팀장만 추방할 수 있습니다.",
      );

    const member = await taskRepository.findMemberInTask(taskId, targetUserId);
    if (!member)
      throw new NotFoundError("MEMBER_NOT_FOUND", "멤버를 찾을 수 없습니다.");

    await taskRepository.deleteMember(member.id);

    return {
      id: member.id,
      userId: member.userId,
      taskId: member.taskId,
    };
  }

  // 단일 세부 과제 생성 서비스
  async createSingleSubTask(userId, taskId, createData) {
    const parentTask = await taskRepository.findTaskById(taskId);
    if (!parentTask)
      throw new NotFoundError("TASK_NOT_FOUND", "존재하지 않는 과제입니다.");

    // 본인이 멤버인지 확인
    const member = await taskRepository.findMemberInTask(taskId, userId);
    if (!member) {
      throw new ForbiddenError(
        "FORBIDDEN_TASK",
        "해당 과제에 접근할 권한이 없습니다.",
      );
    }

    // PERSONAL 과제의 경우, 소유자만 생성 가능
    if (parentTask.type === "PERSONAL" && member.role !== false) {
      throw new ForbiddenError(
        "FORBIDDEN_PERSONAL_TASK",
        "개인 과제의 세부 과제는 소유자만 생성할 수 있습니다.",
      );
    }

    const endDateRaw = createData.endDate ?? createData.deadline;
    const endDate =
      endDateRaw instanceof Date
        ? endDateRaw
        : endDateRaw
          ? calculateAlarmDate(
              endDateRaw,
              member?.user?.alarmSetting?.taskAlarm,
            )
          : null;
    if (!endDate || Number.isNaN(endDate.getTime())) {
      throw new BadRequestError(
        "SUBTASK_END_DATE_REQUIRED",
        "세부 과제 마감일(deadline)이 필요합니다.",
      );
    }

    // 부모 과제의 마감일이 설정되어 있으면, 세부 과제 마감일은 부모 마감일보다 늦을 수 없습니다.
    if (parentTask.deadline) {
      const parentDeadline = new Date(parentTask.deadline);
      if (
        isNaN(parentDeadline.getTime()) === false &&
        endDate > parentDeadline
      ) {
        throw new BadRequestError(
          "INVALID_DEADLINE",
          "세부 과제의 마감일은 부모 과제의 마감일보다 늦을 수 없습니다.",
        );
      }
    }

    const members = await prisma.member.findMany({
      where: { taskId: parseInt(taskId, 10) },
    });

    const assigneeUserIds = Array.isArray(createData.assigneeIds)
      ? createData.assigneeIds
      : createData.assigneeId != null
      ? [createData.assigneeId]
      : [];

    const assigneeMemberIds = this.resolveSubTaskAssigneeMemberIds(
      parentTask,
      members,
      assigneeUserIds,
      userId,
    );

    return await prisma.$transaction(async (tx) => {
      const newSubTask = await taskRepository.createSubTask(
        {
          taskId: parseInt(taskId, 10),
          title: createData.title,
          endDate,
          status: "PENDING",
          isAlarm: createData.isAlarm !== false,
          assigneeMemberIds,
        },
        tx,
      );

      if (!newSubTask.isAlarm || !newSubTask.subTaskAssignees?.length) {
        return {
          subTaskId: newSubTask.id,
          title: newSubTask.title,
          deadline: newSubTask.endDate,
          status: newSubTask.status,
          assignees: [],
        };
      }

      for (const assignment of newSubTask.subTaskAssignees) {
        const assignee = assignment.member;
        if (!assignee?.userId) continue;

        const alarmHours =
          assignee.user?.alarmSetting?.taskAlarm ?? 24;
        const alarmDate = calculateAlarmDate(newSubTask.endDate, alarmHours);

        await alarmRepository.createSubTaskAlarm(
          assignee.userId,
          newSubTask.taskId,
          newSubTask.id,
          newSubTask.title,
          alarmDate,
          tx,
        );
      }

      return {
        subTaskId: newSubTask.id,
        title: newSubTask.title,
        deadline: newSubTask.endDate,
        status: newSubTask.status,
        assignees: newSubTask.subTaskAssignees.map((assignment) => ({
          memberId: assignment.member.id,
          userId: assignment.member.user.id,
          nickname: assignment.member.user.nickname,
          profileImage: assignment.member.user.profileImage || null,
        })),
      };
    });
  }

  // 단일 세부 과제 수정
  async updateSelectedSubTasks(userId, taskId, subTaskUpdates) {
    // 부모 과제 존재 여부 확인
    const parentTask = await taskRepository.findTaskById(taskId);
    if (!parentTask)
      throw new NotFoundError("TASK_NOT_FOUND", "존재하지 않는 과제입니다.");

    // 멤버 존재 여부 확인
    const userCheck = await taskRepository.findMemberInTask(taskId, userId);
    if (!userCheck)
      throw new ForbiddenError(
        "FORBIDDEN_TASK",
        "해당 과제에 접근할 권한이 없습니다.",
      );

    // PERSONAL 과제의 경우, 소유자만 수정 가능
    if (parentTask.type === "PERSONAL" && userCheck.role !== false) {
      throw new ForbiddenError(
        "FORBIDDEN_PERSONAL_TASK",
        "개인 과제의 세부 과제는 소유자만 수정할 수 있습니다.",
      );
    }

    return await prisma.$transaction(async (tx) => {
      const results = [];
      for (const { subTaskId, ...updateData } of subTaskUpdates) {
        if (Object.keys(updateData).length === 0) {
          throw new Error("수정할 값이 없습니다.");
        }
        const subTask = await taskRepository.findSubTaskById(subTaskId, tx);
        if (!subTask) {
          throw new NotFoundError("세부 과제가 존재하지 않습니다.");
        }

        const assignmentUserIds = [];
        if (updateData.assigneeId !== undefined) {
          assignmentUserIds.push(updateData.assigneeId);
        }
        if (Array.isArray(updateData.assigneeIds)) {
          assignmentUserIds.push(...updateData.assigneeIds);
        }

        const normalizedAssignmentUserIds = Array.from(
          new Set(
            assignmentUserIds
              .map((id) => Number(id))
              .filter((id) => !Number.isNaN(id) && id > 0),
          ),
        );

        const assignmentChangeRequested =
          updateData.assigneeId !== undefined ||
          updateData.assigneeIds !== undefined;

        if (assignmentChangeRequested) {
          const assigneeMemberIds = normalizedAssignmentUserIds.length > 0
            ? this.resolveSubTaskAssigneeMemberIds(
                parentTask,
                await prisma.member.findMany({ where: { taskId } }),
                normalizedAssignmentUserIds,
                userId,
              )
            : [];

          await taskRepository.replaceSubTaskAssignees(
            subTaskId,
            assigneeMemberIds,
            tx,
          );
        }

        const subTaskUpdatePayload = { ...updateData };
        delete subTaskUpdatePayload.assigneeId;
        delete subTaskUpdatePayload.assigneeIds;

        // 세부 과제 수정
        const updatedSubTask = await taskRepository.updateSubTask(
          subTaskId,
          subTaskUpdatePayload,
          tx,
        );

        if (assignmentChangeRequested || updatedSubTask.isAlarm === false) {
          await alarmRepository.deleteAlarmsBySubTaskIds([subTaskId], tx);
        }

        if (updatedSubTask.isAlarm && assignmentChangeRequested) {
          const newAssignments = updatedSubTask.subTaskAssignees || [];
          for (const assignment of newAssignments) {
            const assignee = assignment.member;
            if (!assignee?.userId) continue;

            const alarmHours =
              assignee.user?.alarmSetting?.taskAlarm ?? 24;
            const alarmDate = calculateAlarmDate(
              updatedSubTask.endDate,
              alarmHours,
            );

            await alarmRepository.createSubTaskAlarm(
              assignee.userId,
              updatedSubTask.taskId,
              updatedSubTask.id,
              updatedSubTask.title,
              alarmDate,
              tx,
            );
          }
        }

        results.push({
          subTaskId: updatedSubTask.id,
          title: updatedSubTask.title,
          deadline: updatedSubTask.endDate,
          isAlarm: updatedSubTask.isAlarm,
        });
      }
      return results;
    });
  }

  // 단일 세부 과제 삭제
  async deleteSelectedSubTasks(userId, taskId, subTaskIds) {
    const parentTask = await taskRepository.findTaskById(taskId);
    if (!parentTask)
      throw new NotFoundError("TASK_NOT_FOUND", "존재하지 않는 과제입니다.");

    const userCheck = await taskRepository.findMemberInTask(taskId, userId);
    if (!userCheck)
      throw new ForbiddenError(
        "FORBIDDEN_TASK",
        "해당 과제에 접근할 권한이 없습니다.",
      );

    // PERSONAL 과제의 경우, 소유자만 삭제 가능
    if (parentTask.type === "PERSONAL" && userCheck.role !== false) {
      throw new ForbiddenError(
        "FORBIDDEN_PERSONAL_TASK",
        "개인 과제의 세부 과제는 소유자만 삭제할 수 있습니다.",
      );
    }

    if (!subTaskIds || subTaskIds.length === 0) {
      throw new NotFoundError(
        "NO_SUBTASKS_TO_DELETE",
        "삭제할 세부 과제가 없습니다.",
      );
    }

    return await prisma.$transaction(async (tx) => {
      // 알림 삭제
      await alarmRepository.deleteAlarmsBySubTaskIds(subTaskIds, tx);

      // 세부 과제 삭제
      const result = await taskRepository.deleteSubTasksByIds(subTaskIds, tx);

      return { deletedCount: result.count };
    });
  }

  // 전체 세부 과제 삭제
  async deleteAllSubTasks(userId, taskId) {
    const parentTask = await taskRepository.findTaskById(taskId);
    if (!parentTask)
      throw new NotFoundError("TASK_NOT_FOUND", "존재하지 않는 과제입니다.");

    const userCheck = await taskRepository.findMemberInTask(taskId, userId);
    if (!userCheck)
      throw new ForbiddenError(
        "FORBIDDEN_TASK",
        "해당 과제에 접근할 권한이 없습니다.",
      );

    // PERSONAL 과제의 경우, 소유자만 삭제 가능
    if (parentTask.type === "PERSONAL" && userCheck.role !== false) {
      throw new ForbiddenError(
        "FORBIDDEN_PERSONAL_TASK",
        "개인 과제의 세부 과제는 소유자만 삭제할 수 있습니다.",
      );
    }

    return await prisma.$transaction(async (tx) => {
      // subTask id 전부 조회
      const subTasks = await taskRepository.findSubTaskIdsByTaskId(taskId, tx);
      const subTaskIds = subTasks.map((st) => st.id);

      if (subTaskIds.length === 0) {
        return { deletedCount: 0 };
      }

      // 알림 삭제
      await alarmRepository.deleteAlarmsBySubTaskIds(subTaskIds, tx);

      // 세부 과제 삭제
      await taskRepository.deleteAllSubTasksByTaskId(taskId, tx);

      return { deleted: subTaskIds };
    });
  }
}

export default new TaskService();
