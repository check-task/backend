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

class TaskService {
  // 완료 과제 조회
  async getCompletedTasks(userId) {
    const user = await userRepository.getUserData(userId);
    if (!user) {
      throw new NotFoundError(
        "USER_NOT_FOUND",
        "해당 사용자를 찾을 수 없습니다.",
      );
    }

    return await taskRepository.getCompletedTasks(userId);
  }

  // 과제 목록 조회
  async getTaskList(userId, queryParams = {}) {
    let { type, folderId, sort, status } = queryParams;

    // 3. 실제 DB 조회
    const tasks = await taskRepository.findAllTasks({
      userId,
      type,
      folderId,
      sort,
      status,
    });

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
    const isPersonal = parentTask.type === "PERSONAL";
    if (assigneeUserId != null) {
      const m = members.find((x) => x.userId === assigneeUserId);
      if (!m) {
        throw new BadRequestError(
          "ASSIGNEE_NOT_IN_TASK",
          "해당 과제의 멤버만 담당자로 지정할 수 있습니다.",
        );
      }
      if (isPersonal) {
        const owner = members.find((mem) => mem.role === false);
        if (!owner || owner.userId !== assigneeUserId) {
          throw new BadRequestError(
            "ASSIGNEE_NOT_OWNER",
            "개인 과제는 과제 소유자(User)만 담당자로 지정할 수 있습니다.",
          );
        }
      }
      return m.id;
    }
    if (isPersonal) {
      const self = members.find((x) => x.userId === actingUserId);
      return self?.id ?? null;
    }
    return null;
  }

  // 과제 생성
  async registerTask(userId, data) {
    const { subTasks, references, communications, folderId, ...taskData } = data;

    if (!taskData.title) throw new BadRequestError("TASK_TITLE_REQUIRED", "과제명은 필수입니다.");
    if ("folderId" in data) {
      let targetFolderId;

      if (data.folderId === null) {
        const defaultFolder = await taskRepository.findFolderByUserIdAndName(userId, "지정안함");
        if (!defaultFolder) throw new Error("기본 폴더가 존재하지 않습니다.");
        targetFolderId = defaultFolder.id;
      } else {
        targetFolderId = Number(data.folderId);
        if (isNaN(targetFolderId)) throw new Error("folderId는 숫자여야 합니다.");

        const folderCheck = await taskRepository.findFolderById(targetFolderId);
        if (!folderCheck) throw new Error("폴더가 존재하지 않습니다.");
        if (folderCheck.userId !== userId) throw new Error("본인 폴더가 아닙니다.");
      }

      delete data.folderId;
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
        folderId || null,
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
          if (!(endDate instanceof Date) || isNaN(endDate.getTime())) {throw new BadRequestError("SUBTASK_END_DATE_REQUIRED", "세부 과제 마감일이 필요합니다.",);}

          return {
            title: st.title,
            endDate,
            status: st.status ?? "PENDING",
            isAlarm: st.isAlarm !== false,
            assigneeId: null,
          };
        });

        await taskRepository.addSubTasks(newTask.id, resolvedSubRows, tx);

        const createdSubTasksList = await tx.subTask.findMany({
          where: { taskId: newTask.id },
          include: {
            assignee: {
              include: { user: { include: { alarmSetting: true } } },
            },
          },
        });

        for (const subTask of createdSubTasksList) {
          if (
            subTask.isAlarm &&
            subTask.assigneeId &&
            subTask.assignee?.userId
          ) {
            const assignee = subTask.assignee;
            const alarmHours = assignee.user?.alarmSetting?.taskAlarm ?? 24;
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
  async modifyTask(taskId, userId, updateData, files = []) {
    // 과제 존재 여부 확인
    const currentTask = await taskRepository.findTaskById(taskId);
    if (!currentTask) throw new NotFoundError("수정하려는 과제가 존재하지 않습니다.");

    // 본인이 멤버인지 확인
    const member = await taskRepository.findMemberInTask(taskId, userId);
    if (!member) {
      throw new ForbiddenError("FORBIDDEN_TASK", "해당 과제를 수정할 권한이 없습니다.");
    }

    if (Object.keys(updateData).length === 0) {
      throw new Error("수정할 값이 없습니다.");
    }

    // 폴더 존재 여부 확인
    if ("folderId" in updateData) {
      let targetFolderId;

      if (updateData.folderId === null) {
        const defaultFolder = await taskRepository.findFolderByUserIdAndName(userId, "지정안함");
        if (!defaultFolder) throw new Error("기본 폴더가 존재하지 않습니다.");
        targetFolderId = defaultFolder.id;
      } else {
        targetFolderId = Number(updateData.folderId);
        if (isNaN(targetFolderId)) throw new Error("folderId는 숫자여야 합니다.");

        const folderCheck = await taskRepository.findFolderById(targetFolderId);
        if (!folderCheck) throw new Error("폴더가 존재하지 않습니다.");
        if (folderCheck.userId !== userId) throw new Error("본인 폴더가 아닙니다.");
      }

      // 폴더 업데이트
      await taskRepository.updateMemberFolder({
        userId,
        taskId,
        folderId: targetFolderId,
      });

      delete updateData.folderId;

      console.log("폴더 업데이트 성공")
      console.log(updateData)
    }

    return await prisma.$transaction(async (tx) => {
      const referenceData = [];

      // JSON 문자열로 들어온 링크 데이터 취합
      if (updateData.references && Array.isArray(updateData.references)) {
        updateData.references.forEach(ref => {
          referenceData.push({
            taskId: Number(taskId),
            name: ref.name,
            url: ref.url || null,
            fileUrl: ref.fileUrl || null
          });
        });
        delete updateData.references; // Task 테이블 데이터에서는 삭제
      }

      // 업로드된 파일 정보 취합
      if (files && files.length > 0) {
        files.forEach(file => {
          referenceData.push({
            taskId: Number(taskId),
            name: file.originalname,
            fileUrl: file.location || file.path
          });
        });
      }

      // DB에 한꺼번에 저장
      if (referenceData.length > 0) {
        await tx.reference.createMany({ data: referenceData });
      }

      const updatedTask = await tx.task.update({
        where: { id: Number(taskId) },
        data: updateData
      });

      return { taskId: updatedTask.id };
    });
  }

  // Task 마감일 변경 서비스
  async updateTaskDeadline(userId, taskId, deadline) {
    // 1. Task 존재 여부 확인
    const existingTask = await taskRepository.findTaskById(taskId);
    if (!existingTask) {
      throw new NotFoundError("존재하지 않는 과제입니다.");
    }

    // 2. 수정 권한 확인 (중요!)
    // 해당 유저가 과제의 Owner(생성자/관리자)인지 확인합니다.
    const member = await prisma.member.findFirst({
      where: {
        taskId: taskId,
        userId: userId,
        role: false, // role: false가 Owner 권한
      },
    });

    if (!member) {
      throw new ForbiddenError("과제 마감일을 수정할 권한이 없습니다.");
    }

    // 3. 날짜 형식 유효성 검사
    const newDeadline = new Date(deadline);
    if (isNaN(newDeadline.getTime())) {
      throw new BadRequestError("유효하지 않은 날짜 형식입니다.");
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

  // 과제 삭제
  async removeTask(taskId, userId) {
    // 과제 존재 여부 확인
    const currentTask = await taskRepository.findTaskById(taskId);
    if (!currentTask) {
      throw new NotFoundError("삭제하려는 과제가 존재하지 않습니다.");
    }

    // 본인이 멤버인지 확인
    const member = await taskRepository.findMemberInTask(taskId, userId);
    if (!member) {
      throw new ForbiddenError("FORBIDDEN_TASK", "해당 과제를 삭제할 권한이 없습니다.");
    }

    // 과제 삭제 실행
    return await taskRepository.deleteTask(taskId);
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
      throw new ForbiddenError("FORBIDDEN_TASK", "해당 과제에 접근할 권한이 없습니다.");
    }

    return taskDetail;
  }

  // 우선순위 변경
  async updatePriorities(userId, orderedTasks) {
    // 각 과제에 대해 본인이 멤버인지 확인
    for (const item of orderedTasks) {
      const member = await taskRepository.findMemberInTask(item.taskId, userId);
      if (!member) {
        throw new ForbiddenError("FORBIDDEN_TASK", "해당 과제에 접근할 권한이 없습니다.");
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
        const error = new Error("해당하는 세부 태스크를 찾을 수 없습니다.");
        error.status = 404;
        throw error;
      }

      // 본인이 멤버인지 확인
      const member = await taskRepository.findMemberInTask(existingTask.taskId, userId);
      if (!member) {
        throw new ForbiddenError("FORBIDDEN_TASK", "해당 과제에 접근할 권한이 없습니다.");
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
      const member = await taskRepository.findMemberInTask(existingTask.taskId, userId);
      if (!member) {
        throw new ForbiddenError("FORBIDDEN_TASK", "해당 과제에 접근할 권한이 없습니다.");
      }

      const newDeadline = new Date(deadline);
      const parentEndDate = new Date(existingTask.task.deadline);

      // 부모 태스크의 마감일을 초과하는지 확인
      if (newDeadline > parentEndDate) {
        const error = new Error("부모 Task의 마감일을 초과할 수 없습니다.");
        error.statusCode = 400;
        throw error;
      }

      // 마감일 업데이트
      const updatedTask = await prisma.subTask.update({
        where: { id: parseInt(subTaskId) },
        data: {
          endDate: newDeadline,
          updatedAt: new Date(),
        },
      });

      return updatedTask;
    } catch (error) {
      console.error("Error updating subtask deadline:", error);
      throw error;
    }
  }

  // 세부 TASK 담당자 설정 API
  /** body.assigneeId = User.id. DB SubTask.assigneeId = 해당 Task의 Member.id (FK). */
  async setSubTaskAssignee(subTaskId, assigneeId, userId) {
    console.log(
      "Service - subTaskId:",
      subTaskId,
      "assigneeId (User.id):",
      assigneeId,
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

      if (parsedAssigneeUserId != null) {
        const userExists = await prisma.user.findUnique({
          where: { id: parsedAssigneeUserId },
        });
        if (!userExists) {
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
          assignee: { include: { user: { include: { alarmSetting: true } } } },
        },
      });

      if (!existingTask) {
        const error = new Error("해당하는 세부 태스크를 찾을 수 없습니다.");
        error.statusCode = 404;
        error.errorCode = "SUBTASK_NOT_FOUND";
        throw error;
      }

      // 본인이 멤버인지 확인
      const member = await taskRepository.findMemberInTask(existingTask.taskId, userId);
      if (!member) {
        throw new ForbiddenError("FORBIDDEN_TASK", "해당 과제에 접근할 권한이 없습니다.");
      }

      const task = existingTask.task;
      const isTeamTask = task.type === "TEAM";
      const previousAssigneeMemberId = existingTask.assigneeId;
      const nextAssigneeMemberId =
        parsedAssigneeUserId != null
          ? (task.members.find((m) => m.userId === parsedAssigneeUserId)?.id ??
            null)
          : null;

      const memberIdChanged =
        previousAssigneeMemberId !== (nextAssigneeMemberId ?? null);
      const previousNotifyUserId =
        previousAssigneeMemberId != null
          ? (task.members.find((m) => m.id === previousAssigneeMemberId)
              ?.userId ??
            existingTask.assignee?.userId ??
            null)
          : null;

      if (parsedAssigneeUserId != null) {
        if (nextAssigneeMemberId == null) {
          const error = new Error(
            "해당 과제의 멤버만 담당자로 지정할 수 있습니다.",
          );
          error.statusCode = 400;
          error.errorCode = "ASSIGNEE_NOT_IN_TASK";
          throw error;
        }

        if (!isTeamTask) {
          const ownerMember = task.members.find((m) => m.role === false);
          if (!ownerMember || ownerMember.userId !== parsedAssigneeUserId) {
            const error = new Error(
              "개인 과제는 과제 소유자(User)만 담당자로 지정할 수 있습니다.",
            );
            error.statusCode = 400;
            throw error;
          }
        }
      }

      return await prisma.$transaction(async (tx) => {
        // 담당자가 변경되거나 null로 설정될 때 기존 알림 삭제
        if (memberIdChanged && previousNotifyUserId != null) {
          await alarmRepository.deleteSubTaskAlarm(
            previousNotifyUserId,
            parsedSubTaskId,
            tx,
          );
        }

        // 담당자를 null로 설정하고, 기존에 담당자가 있었던 경우 추가 알림 삭제
        if (parsedAssigneeUserId == null && previousNotifyUserId != null) {
          await alarmRepository.deleteSubTaskAlarm(
            previousNotifyUserId,
            parsedSubTaskId,
            tx,
          );
        }

        const updatedTask = await tx.subTask.update({
          where: { id: parsedSubTaskId },
          data: {
            assigneeId: nextAssigneeMemberId,
            updatedAt: new Date(),
          },
          include: { task: true },
        });

        if (
          nextAssigneeMemberId != null &&
          updatedTask.isAlarm &&
          memberIdChanged
        ) {
          const newMember = await tx.member.findFirst({
            where: { id: nextAssigneeMemberId, taskId: task.id },
            include: { user: { include: { alarmSetting: true } } },
          });

          if (newMember?.userId) {
            const alarmHours = newMember.user?.alarmSetting?.taskAlarm ?? 24;
            const alarmDate = calculateAlarmDate(
              updatedTask.endDate,
              alarmHours,
            );

            await alarmRepository.createSubTaskAlarm(
              newMember.userId,
              Number(updatedTask.taskId),
              Number(updatedTask.id),
              updatedTask.title,
              alarmDate,
              tx,
            );
          }
        }

        console.log("Updated task:", updatedTask);

        return {
          subTaskId: updatedTask.id,
          assigneeId: parsedAssigneeUserId,
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
      const defaultFolder = await taskRepository.findFolderByUserIdAndName(userId, "지정안함");
      
      // "지정안함" 폴더조차 없는 경우에 대한 방어 로직
      if (!defaultFolder) {
        throw new NotFoundError("DEFAULT_FOLDER_NOT_FOUND", "기본 폴더(지정안함)를 찾을 수 없습니다. 폴더를 먼저 생성해주세요.");
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
  async modifyMemberRole(taskId, userId, role) {
    const member = await taskRepository.findMemberInTask(taskId, userId);
    if (!member)
      throw new NotFoundError("해당 과제에서 해당 유저를 찾을 수 없음");

    const isTargetBecomingOwner = role === 0;

    return await prisma.$transaction(async (tx) => {
      if (isTargetBecomingOwner) {
        await taskRepository.resetOtherMembersRole(taskId, userId, tx);
      }

      const dbRoleValue = isTargetBecomingOwner ? false : true;
      return await taskRepository.updateMemberRole(member.id, dbRoleValue, tx);
    });
  }

  // 팀원 추방
  async outMember(taskId, memberId, userId) {
    console.log("서비스 로직 : ", taskId, memberId, userId);

    const requestingUser = await taskRepository.findMemberInTask(
      taskId,
      userId,
    );
    console.log("팀장확인:", requestingUser);
    if (!requestingUser)
      throw new NotFoundError("요청한 유저가 팀에 없습니다.");
    if (requestingUser.role !== false)
      throw new UnauthorizedError(
        "권한이 없습니다. 팀장만 추방할 수 있습니다.",
      );

    const member = await taskRepository.findMemberInTask(taskId, memberId);
    if (!member) throw new NotFoundError("멤버를 찾을 수 없음");

    await taskRepository.deleteMember(member.id);

    return {
      id: member.id,
      userId: member.userId,
      memberId: member.memberId,
      taskId: member.taskId,
    };
  }

  // 단일 세부 과제 생성 서비스
  async createSingleSubTask(userId, taskId, createData) {
    const parentTask = await taskRepository.findTaskById(taskId);
    if (!parentTask) throw new NotFoundError("존재하지 않는 과제입니다.");

    // 본인이 멤버인지 확인
    const member = await taskRepository.findMemberInTask(taskId, userId);
    if (!member) {
      throw new ForbiddenError("FORBIDDEN_TASK", "해당 과제에 접근할 권한이 없습니다.");
    }

    const endDateRaw = createData.endDate ?? createData.deadline;
    const endDate =
      endDateRaw instanceof Date
        ? endDateRaw
        : endDateRaw
          ? new Date(endDateRaw)
          : null;
    if (!endDate || Number.isNaN(endDate.getTime())) {
      throw new BadRequestError(
        "SUBTASK_END_DATE_REQUIRED",
        "세부 과제 마감일(deadline)이 필요합니다.",
      );
    }

    const members = await prisma.member.findMany({
      where: { taskId: parseInt(taskId, 10) },
    });

    const rawAssignee = createData.assigneeId;
    const assigneeUserId =
      rawAssignee != null && rawAssignee !== "" ? Number(rawAssignee) : null;
    if (
      assigneeUserId != null &&
      (Number.isNaN(assigneeUserId) || assigneeUserId <= 0)
    ) {
      throw new BadRequestError(
        "INVALID_ASSIGNEE",
        "담당자(User) ID가 올바르지 않습니다.",
      );
    }

    const assigneeMemberId = this.resolveSubTaskAssigneeMemberId(
      parentTask,
      members,
      assigneeUserId,
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
          assigneeId: assigneeMemberId,
        },
        tx,
      );

      if (
        newSubTask.isAlarm &&
        newSubTask.assigneeId &&
        newSubTask.assignee?.userId
      ) {
        const alarmHours =
          newSubTask.assignee?.user?.alarmSetting?.taskAlarm ?? 24;
        const alarmDate = calculateAlarmDate(newSubTask.endDate, alarmHours);

        await alarmRepository.createSubTaskAlarm(
          newSubTask.assignee.userId,
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
        assigneeName: newSubTask.assignee?.user?.nickname || "none",
      };
    });
  }

  // 단일 세부 과제 수정
  async updateSelectedSubTasks(userId, taskId, subTaskUpdates) {
    // 부모 과제 존재 여부 확인
    const parentTask = await taskRepository.findTaskById(taskId);
    if (!parentTask) throw new NotFoundError("존재하지 않는 과제입니다.");

    // 멤버 존재 여부 확인
    const userCheck = await taskRepository.findMemberInTask(taskId, userId);
    if (!userCheck)
      throw new ForbiddenError("유저가 해당 과제에 권한이 없습니다.");

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


        // 세부 과제 수정
        const updatedSubTask = await taskRepository.updateSubTask(
          subTaskId, 
          updateData, 
          tx
        );

        // 기존 알람 찾기
        const existingAlarm = await taskRepository.findAlarmBySubTaskId(
          subTaskId,
          tx,
        );

        let alarmDate = null;
        if (updatedSubTask.isAlarm && updatedSubTask.assigneeId) {
          const alarmHours =
            updatedSubTask.assignee?.user?.alarmSetting?.taskAlarm ?? 24;

          alarmDate = calculateAlarmDate(updatedSubTask.endDate, alarmHours);
        }

        if (updatedSubTask.isAlarm && alarmDate) {
          if (existingAlarm) {
            await alarmRepository.updateAlarm(
              existingAlarm.id,
              {
                title: `'${updatedSubTask.title}'의 마감까지 ${updatedSubTask.assignee?.user?.alarmSetting?.taskAlarm}시간 남았어요!`,
                alarmContent: `'${updatedSubTask.title}' 진행 중입니다.`,
                alarmDate,
              },
              tx,
            );
          } else {
            const notifyUserId = updatedSubTask.assignee?.userId;
            if (notifyUserId) {
              await alarmRepository.createSubTaskAlarm(
                notifyUserId,
                updatedSubTask.taskId,
                updatedSubTask.id,
                updatedSubTask.title,
                alarmDate,
                tx,
              );
            }
          }
        } else if (existingAlarm) {
          await alarmRepository.deleteAlarmById(existingAlarm.id, tx);
        }

        results.push({
          subTaskId: updatedSubTask.id,
          title: updatedSubTask.title,
          deadline: updatedSubTask.endDate,
        });
      }
    return results; 
    });
  }

  // 단일 세부 과제 삭제
  async deleteSelectedSubTasks(userId, taskId, subTaskIds) {
    const parentTask = await taskRepository.findTaskById(taskId);
    if (!parentTask) throw new NotFoundError("존재하지 않는 과제입니다.");

    const userCheck = await taskRepository.findMemberInTask(taskId, userId);
    if (!userCheck) throw new ForbiddenError("권한이 없습니다.");

    if (!subTaskIds || subTaskIds.length === 0) {
      throw new NotFoundError("삭제할 세부 과제가 없습니다.");
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
    if (!parentTask) throw new NotFoundError("존재하지 않는 과제입니다.");

    const userCheck = await taskRepository.findMemberInTask(taskId, userId);
    if (!userCheck) throw new ForbiddenError("권한이 없습니다.");

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
      const result = await taskRepository.deleteAllSubTasksByTaskId(taskId, tx);

      return { deletedCount: result.count };
    });
  }
}

export default new TaskService();
