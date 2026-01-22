import taskRepository from "../repositories/task.repository.js";
import { BadRequestError, NotFoundError, ForbiddenError } from "../errors/custom.error.js";
import { getUserData } from "../repositories/user.repository.js";
import { responseFromCompletedTasks } from "../dtos/task.dto.js";
import { prisma } from "../db.config.js";
import { createTaskAlarm, createSubTaskAlarm, deleteSubTaskAlarm } from "../repositories/alarm.repository.js";
import { calculateAlarmDate } from "../utils/calculateAlarmDate.js";

class TaskService {
  async getCompletedTasks(userId) {
    const user = await getUserData(userId);
    if (!user) {
      throw new NotFoundError("USER_NOT_FOUND", "해당 사용자를 찾을 수 없습니다.");
    }

    const tasks = await taskRepository.getCompletedTasks(userId);

    return responseFromCompletedTasks(tasks);
  }

  // 과제 등록
  async registerTask(userId, data) {
    const { subTasks, references, folderId, ...taskData } = data;

    if (!taskData.title) throw new BadRequestError("과제명은 필수입니다.");

    // folderId가 있을 때만 폴더 존재 여부 확인
    if (folderId) {
      const folder = await taskRepository.findFolderById(folderId);
      if (!folder) throw new NotFoundError("존재하지 않는 폴더입니다.");
    }

    return await prisma.$transaction(async (tx) => {
      // 과제 생성
      const newTask = await taskRepository.createTask({ ...taskData, folderId }, tx);

      // 과제 생성자를 owner로 멤버에 자동 추가
      await taskRepository.createMember(userId, newTask.id, false, tx); // false = owner

      // 과제 알림 생성
      if (newTask.isAlarm) {
        // 팀 과제인 경우: 멤버 모두에게 알림 생성
        if (newTask.type === 'TEAM') {
          // 멤버 조회 (생성자 포함)
          const members = await tx.member.findMany({
            where: { taskId: newTask.id },
            include: { user: true },
          });

          if (members.length > 0) {
            // 모든 멤버에게 알림 생성
            const alarmPromises = members.map(async (member) => {
              const user = member.user;
              const alarmHours = user.taskAlarm || 24;
              const alarmDate = calculateAlarmDate(newTask.deadline, alarmHours);

              return createTaskAlarm(
                member.userId,
                newTask.id,
                newTask.title,
                alarmDate,
                tx
              );
            });
            await Promise.all(alarmPromises);
          }
        } else {
          // 개인 과제인 경우: 생성자에게만 알림 생성
          const creator = await tx.user.findUnique({
            where: { id: userId },
            select: { taskAlarm: true },
          });

          if (creator) {
            const alarmHours = creator.taskAlarm || 24;
            const alarmDate = calculateAlarmDate(newTask.deadline, alarmHours);

            await createTaskAlarm(
              userId,
              newTask.id,
              newTask.title,
              alarmDate,
              tx
            );
          }
        }
      }

      // 하위 데이터 저장
      if (subTasks && subTasks.length > 0) {
        await taskRepository.addSubTasks(newTask.id, subTasks, tx);

        // 세부과제 생성 후 알림 생성
        const createdSubTasksList = await tx.subTask.findMany({
          where: { taskId: newTask.id },
          include: { assignee: true },
        });

        for (const subTask of createdSubTasksList) {
          // 세부과제 담당자에게 알림 생성
          if (subTask.isAlarm && subTask.assigneeId) {
            const assignee = subTask.assignee;
            if (assignee) {
              const alarmHours = assignee.taskAlarm || 24;
              const alarmDate = new Date(subTask.endDate);
              alarmDate.setHours(alarmDate.getHours() - alarmHours);

              await createSubTaskAlarm(
                subTask.assigneeId,
                subTask.taskId,
                subTask.id,
                subTask.title,
                alarmDate,
                tx
              );
            }
          }
        }
      }

      if (references && references.length > 0) {
        await taskRepository.addReferences(newTask.id, references, tx);
      }

      return { taskId: newTask.id };
    });
  }

  // 과제 수정
  async modifyTask(taskId, data) {
    const { subTasks, references, folderId, ...taskData } = data;

    // 과제 존재 여부 확인
    const currentTask = await taskRepository.findTaskById(taskId);
    if (!currentTask) throw new NotFoundError("수정하려는 과제가 존재하지 않습니다.");

    // 폴더
    if (folderId) {
      const folder = await taskRepository.findFolderById(folderId);
      if (!folder) throw new NotFoundError("변경하려는 폴더가 존재하지 않습니다.");
    }

    // 트랜잭션
    return await prisma.$transaction(async (tx) => {
      // 과제 기본 정보 업데이트
      const updatedTask = await taskRepository.updateTask(taskId, { ...taskData, folderId }, tx);

      // 세부 과제 갱신 
      await taskRepository.deleteAllSubTasks(taskId, tx);
      if (subTasks?.length > 0) {
        await taskRepository.addSubTasks(taskId, subTasks, tx);

        // 새로 생성된 세부과제에 대한 알림 생성
        const createdSubTasksList = await tx.subTask.findMany({
          where: { taskId },
          include: { assignee: true },
        });

        for (const subTask of createdSubTasksList) {
          // 세부과제 담당자에게 알림 생성
          if (subTask.isAlarm && subTask.assigneeId) {
            const assignee = subTask.assignee;
            if (assignee) {
              const alarmHours = assignee.taskAlarm || 24;
              const alarmDate = calculateAlarmDate(subTask.endDate, alarmHours);

              await createSubTaskAlarm(
                subTask.assigneeId,
                subTask.taskId,
                subTask.id,
                subTask.title,
                alarmDate,
                tx
              );
            }
          }
        }
      }

      // 자료 갱신 
      await taskRepository.deleteAllReferences(taskId, tx);
      if (references?.length > 0) {
        await taskRepository.addReferences(taskId, references, tx);
      }

      return { taskId: updatedTask.id };
    });
  }

  // 과제 삭제
  async removeTask(taskId) {
    // 과제 존재 여부 확인
    const currentTask = await taskRepository.findTaskById(taskId);
    if (!currentTask) {
      throw new NotFoundError("삭제하려는 과제가 존재하지 않습니다.");
    }

    // 과제 삭제 실행
    return await taskRepository.deleteTask(taskId);
  }

  // 과제 세부 사항 조회
  async getTaskDetail(taskId) {
    const task = await taskRepository.findTaskDetail(taskId);

    if (!task) {
      throw new NotFoundError("과제를 찾을 수 없음");
    }

    return task;
  }

  // 과제 목록 조회
  async getTaskList(userId, queryParams = {}) {
    const { type, folderId, sort } = queryParams;

    // 레포지토리의 findAllTasks 호출
    const tasks = await taskRepository.findAllTasks({
      userId,
      type,
      folderId,
      sort
    });

    return tasks;
  }

  // 세부 TASK 완료 처리 API 
  async updateSubTaskStatus(subTaskId, status) {
    try {
      // 서브태스크 존재 여부 확인
      const existingTask = await prisma.SubTask.findUnique({
        where: { id: parseInt(subTaskId) },
      });

      if (!existingTask) {
        const error = new Error('해당하는 세부 태스크를 찾을 수 없습니다.');
        error.statusCode = 404;
        error.errorCode = 'SUBTASK_NOT_FOUND';
        throw error;
      }

      // 상태 업데이트(프리지마 모델명은 대소문자 구분!)
      const updatedTask = await prisma.SubTask.update({
        where: { id: parseInt(subTaskId) },
        data: {
          status: status === 'COMPLETE' ? 'COMPLETED' : 'PENDING',
          updatedAt: new Date()
        },
      });

      return updatedTask;
    } catch (error) {
      console.error('Error updating subtask status:', error);
      throw error;
    }
  }



  // 세부task 날짜 변경 API
  async updateSubTaskDeadline(subTaskId, deadline) {
    try {
      // 서브태스크와 상위 태스크 정보 조회
      const existingTask = await prisma.SubTask.findUnique({
        where: { id: parseInt(subTaskId) },
        include: {
          task: {
            select: {
              deadline: true
            }
          }
        }
      });

      if (!existingTask) {
        const error = new Error('해당하는 세부 태스크를 찾을 수 없습니다.');
        error.statusCode = 404;
        error.errorCode = 'SUBTASK_NOT_FOUND';
        throw error;
      }

      const newDeadline = new Date(deadline);
      const parentEndDate = new Date(existingTask.task.deadline);

      // 부모 태스크의 마감일을 초과하는지 확인
      if (newDeadline > parentEndDate) {
        const error = new Error('부모 Task의 마감일을 초과할 수 없습니다.');
        error.statusCode = 400;
        throw error;
      }

      // 마감일 업데이트
      const updatedTask = await prisma.SubTask.update({
        where: { id: parseInt(subTaskId) },
        data: {
          endDate: newDeadline,
          updatedAt: new Date()
        },
      });

      return updatedTask;
    } catch (error) {
      console.error('Error updating subtask deadline:', error);
      throw error;
    }
  }

  // 세부 TASK 담당자 설정 API
  async setSubTaskAssignee(subTaskId, assigneeId) {
    console.log('Service - subTaskId:', subTaskId, 'assigneeId:', assigneeId);

    try {
      // ID 유효성 검사
      const parsedSubTaskId = parseInt(subTaskId);
      if (isNaN(parsedSubTaskId)) {
        const error = new Error('유효하지 않은 세부 태스크 ID입니다.');
        error.statusCode = 400;
        throw error;
      }

      // 서브태스크와 관련된 Task, Member 정보 조회
      const existingTask = await prisma.subTask.findUnique({
        where: { id: parsedSubTaskId },
        include: {
          task: {
            include: {
              members: true,
            }
          },
          assignee: true
        }
      });

      if (!existingTask) {
        const error = new Error('해당하는 세부 태스크를 찾을 수 없습니다.');
        error.statusCode = 404;
        error.errorCode = 'SUBTASK_NOT_FOUND';
        throw error;
      }

      const task = existingTask.task;
      const isTeamTask = task.type === 'TEAM';
      const previousAssigneeId = existingTask.assigneeId; // 이전 담당자 ID 저장

      // assigneeId가 있는 경우에만 멤버 확인
      if (assigneeId) {
        const parsedAssigneeId = parseInt(assigneeId);
        if (isNaN(parsedAssigneeId)) {
          const error = new Error('유효하지 않은 담당자 ID입니다.');
          error.statusCode = 400;
          throw error;
        }

        if (isTeamTask) {
          // 팀 과제인 경우: 팀 멤버인지 확인
          const isTeamMember = task.members.some(
            member => member.userId === parsedAssigneeId
          );

          console.log('Is team member:', isTeamMember, 'Team members:', task.members);

          if (!isTeamMember) {
            const error = new Error('팀원만 담당자로 지정할 수 있습니다.');
            error.statusCode = 400;
            throw error;
          }
        } else {
          // 개인 과제인 경우: 본인만 담당자로 지정 가능
          const taskOwner = task.members.find(member => member.role === false)?.user;
          if (taskOwner && taskOwner.id !== parsedAssigneeId) {
            const error = new Error('개인 과제는 본인만 담당자로 지정할 수 있습니다.');
            error.statusCode = 400;
            throw error;
          }
        }
      }

      // 트랜잭션으로 담당자 업데이트 및 알림 생성/삭제
      return await prisma.$transaction(async (tx) => {
        // 이전 담당자가 있고, 담당자가 변경되는 경우 이전 담당자의 알림 삭제
        if (previousAssigneeId && previousAssigneeId !== parseInt(assigneeId || 0)) {
          await deleteSubTaskAlarm(previousAssigneeId, parsedSubTaskId);
        }

        // 담당자 업데이트 (assigneeId가 null이면 담당자 해제)
        const updatedTask = await tx.subTask.update({
          where: { id: parsedSubTaskId },
          data: {
            assigneeId: assigneeId ? parseInt(assigneeId) : null,
            updatedAt: new Date()
          },
          include: {
            task: true
          }
        });

        // 담당자가 해제된 경우 (assigneeId가 null) 이전 담당자의 알림 삭제
        if (!assigneeId && previousAssigneeId) {
          await deleteSubTaskAlarm(previousAssigneeId, parsedSubTaskId, tx);
        }

        // 담당자가 새로 설정되었고, 세부과제 알림이 켜져있으면 알림 생성
        if (assigneeId && updatedTask.isAlarm && previousAssigneeId !== parseInt(assigneeId)) {
          const newAssignee = await tx.user.findUnique({
            where: { id: parseInt(assigneeId) },
            select: { taskAlarm: true },
          });

          if (newAssignee) {
            // 사용자의 taskAlarm 설정에 따라 알림 시간 계산 (기본 24시간 전)
            const alarmHours = newAssignee.taskAlarm || 24;
            const alarmDate = calculateAlarmDate(updatedTask.endDate, alarmHours);

            await createSubTaskAlarm(
              parseInt(assigneeId),
              parseInt(updatedTask.taskId),
              parseInt(updatedTask.id),
              updatedTask.title,
              alarmDate,
              tx
            );
          }
        }

        console.log('Updated task:', updatedTask);

        return {
          subTaskId: updatedTask.id,
          assigneeId: updatedTask.assigneeId
        };
      });
    } catch (error) {
      console.error('Error in setSubTaskAssignee service:', {
        message: error.message,
        stack: error.stack,
        statusCode: error.statusCode
      });

      // 상태 코드가 이미 설정된 에러는 그대로 전파
      if (error.statusCode) {
        // 404 에러의 경우 errorCode가 없으면 추가
        if (error.statusCode === 404 && !error.errorCode) {
          error.errorCode = 'NOT_FOUND';
        }
        throw error;
      }

      // 그 외의 에러는 500 에러로 처리
      error.statusCode = 500;
      error.errorCode = 'INTERNAL_SERVER_ERROR';
      error.message = '서버 내부 오류가 발생했습니다.';
      throw error;
    }
  }

  // 초대 코드 생성
  async generateInviteCode(taskId, userId) {
    // 과제 존재 여부 확인
    const task = await taskRepository.findTaskById(taskId);
    if (!task) {
      throw new NotFoundError("과제를 찾을 수 없습니다.");
    }

    // 사용자가 해당 과제의 멤버인지 확인
    const isMember = await prisma.member.findFirst({
      where: {
        taskId,
        userId,
        role: false // owner만 초대 링크를 생성할 수 있음 (role: false가 owner)
      }
    });

    if (!isMember) {
      throw new ForbiddenError("초대 링크를 생성할 권한이 없습니다.");
    }

    // 랜덤한 8자리 초대 코드 생성 (대문자 + 숫자)
    const inviteCode = Array(8)
      .fill(0)
      .map(() => {
        const random = Math.random() * 36 | 0;
        return random.toString(36).toUpperCase();
      })
      .join('');

    // 트랜잭션으로 초대 코드 업데이트
    const result = await prisma.$transaction(async (tx) => {
      return await taskRepository.updateTaskInviteCode(taskId, inviteCode, tx);
    });

    return {
      invite_code: result.inviteCode,
      invite_expired: result.inviteExpiredAt
    };
  }
  // ... existing code ...

  // 초대 코드로 팀 참여
  async joinTaskByInviteCode(userId, inviteCode) {
    // 초대 코드로 과제 찾기
    const task = await prisma.task.findFirst({
      where: {
        inviteCode: inviteCode,
        type: 'TEAM', // 팀 과제만 가능
      },
    });

    if (!task) {
      throw new NotFoundError("INVALID_INVITE_CODE", "유효하지 않은 초대 코드입니다.");
    }

    // 초대 코드 만료일 확인
    if (task.inviteExpiredAt && new Date() > new Date(task.inviteExpiredAt)) {
      throw new BadRequestError("EXPIRED_INVITE_CODE", "만료된 초대 코드입니다.");
    }

    // 이미 멤버인지 확인
    const existingMember = await prisma.member.findFirst({
      where: {
        taskId: task.id,
        userId: userId,
      },
    });

    if (existingMember) {
      throw new BadRequestError("ALREADY_MEMBER", "이미 팀 멤버입니다.");
    }

    // 트랜잭션으로 멤버 추가 및 알림 생성
    return await prisma.$transaction(async (tx) => {
      // 멤버 추가 (role: true = member)
      const newMember = await taskRepository.createMember(userId, task.id, true, tx);

      // 과제 알림이 켜져있으면 알림 생성
      if (task.isAlarm) {
        const user = await tx.user.findUnique({
          where: { id: userId },
          select: { taskAlarm: true },
        });

        if (user) {
          const alarmHours = user.taskAlarm || 24;
          const alarmDate = calculateAlarmDate(task.deadline, alarmHours);

          await createTaskAlarm(
            userId,
            task.id,
            task.title,
            alarmDate,
            tx
          );
        }
      }

      return {
        taskId: task.id,
        taskTitle: task.title,
        memberId: newMember.id,
      };
    });
  }


}

export default new TaskService();