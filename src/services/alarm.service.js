import {
  alarmListResponseDto,
  updateAlarmReadStatusDto,
  updateDeadlineAlarmDto,
  updateSubtaskAlarmStatusDto,
  updateTaskAlarmDto,
  updateTaskAlarmStatusDto,
  updateAllAlarmReadResponseDto,
} from "../dtos/alarm.dto.js";
import {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
} from "../errors/custom.error.js";
import prisma from "../db.config.js";
import alarmRepository from "../repositories/alarm.repository.js";
import { checkDeletedUser } from "../repositories/user.repository.js";
import { calculateAlarmDate } from "../utils/calculateAlarmDate.js";
import { redis } from "../config/redis.config.js";
import { getMessaging } from "firebase-admin/messaging";

class AlarmService {
  constructor() {
    this.alarmRepository = alarmRepository;
  }

  async getAlarms(userId, cursor, limit, orderBy, order, type) {
    // 알람 조회
    const alarms = await this.alarmRepository.findAlarmsByUserId(userId, {
      cursor,
      limit,
      orderBy,
      order,
      type,
    });

    // 페이징 로직
    const effectiveLimit = limit || 10;
    const hasNextPage = alarms.length > effectiveLimit;
    const data = hasNextPage ? alarms.slice(0, effectiveLimit) : alarms;
    const nextCursor =
      hasNextPage && data.length > 0 ? data[data.length - 1].id : null;

    const user = await checkDeletedUser(userId);
    if (!user) {
      throw new NotFoundError("USER_NOT_FOUND", "사용자를 찾을 수 없습니다.");
    }
    if (user.deletedAt) {
      throw new ForbiddenError(
        "USER_DELETED",
        "탈퇴한 유저는 알림을 조회할 수 없습니다.",
      );
    }

    // DTO 변환
    const responseData = alarmListResponseDto(data);

    return {
      ...responseData,
      meta: {
        hasNextPage,
        cursor: nextCursor,
      },
    };
  }

  // 개별 알림 삭제
  async deleteAlarm(userId, alarmId) {
    // 알림 존재 여부 확인
    const alarm = await this.alarmRepository.findAlarmById(alarmId);
    const user = await checkDeletedUser(userId);

    if (user.deletedAt) {
      throw new ForbiddenError(
        "USER_DELETED",
        "탈퇴한 유저는 알림을 삭제할 수 없습니다.",
      );
    }

    if (!userId) {
      throw new NotFoundError("USER_NOT_FOUND", "사용자를 찾을 수 없습니다.");
    }

    if (!alarm) {
      throw new NotFoundError(
        "ALARM_NOT_FOUND",
        "요청하신 alarmID가 DB에 존재하지 않습니다.",
      );
    }

    // 알림 소유자 확인 (본인의 알림인지)
    if (alarm.userId !== userId) {
      throw new ForbiddenError(
        "ALARM_ACCESS_DENIED",
        "해당 알림에 접근할 권한이 없습니다.",
      );
    }

    // 알림 삭제
    await this.alarmRepository.deleteAlarmById(alarmId);

    return null; // 성공 시 data는 null
  }

  // 전체 알림 삭제
  async deleteAllAlarms(userId) {
    if (!userId) {
      throw new NotFoundError("USER_NOT_FOUND", "사용자를 찾을 수 없습니다.");
    }
    // 유저의 모든 알림 삭제
    await this.alarmRepository.deleteAllAlarmsByUserId(userId);

    return null; // 성공 시 data는 null
  }

  // 최종 마감 알림(deadlineAlarm) 수정
  async updateDeadline(userId, deadlineAlarm) {
    // 1. 설정값 업데이트
    const updatedUser = await this.alarmRepository.updateDeadlineAlarm(
      userId,
      deadlineAlarm,
    );

    // 2. 관련된 기존 알림들 업데이트 로직 추가
    const pendingAlarms =
      await this.alarmRepository.findPendingTaskAlarms(userId);

    for (const alarm of pendingAlarms) {
      if (alarm.task && alarm.task.deadline) {
        const newAlarmDate = calculateAlarmDate(
          alarm.task.deadline,
          deadlineAlarm,
        );
        const taskTitle = alarm.task.title ?? "";
        await this.alarmRepository.updateAlarm(alarm.id, {
          title: `'${taskTitle}'의 마감까지 ${deadlineAlarm}시간 남았어요!`,
          alarmContent: alarm.alarmContent,
          alarmDate: newAlarmDate,
          isRead: false,
        });
      }
    }

    return updateDeadlineAlarmDto({ userId, ...updatedUser });
  }

  // 과제 알림(taskAlarm -> 세부과제용) 수정
  async updateTask(userId, taskAlarm) {
    // 1. 설정값 업데이트
    const updatedUser = await this.alarmRepository.updateTaskAlarm(
      userId,
      taskAlarm,
    );

    // 2. 관련된 기존 알림들 업데이트 로직 추가
    const pendingAlarms =
      await this.alarmRepository.findPendingSubTaskAlarms(userId);

    for (const alarm of pendingAlarms) {
      if (alarm.subTask && alarm.subTask.endDate) {
        const newAlarmDate = calculateAlarmDate(
          alarm.subTask.endDate,
          taskAlarm,
        );
        const subTaskTitle = alarm.subTask.title ?? "";
        await this.alarmRepository.updateAlarm(alarm.id, {
          title: `'${subTaskTitle}'의 마감까지 ${taskAlarm}시간 남았어요!`,
          alarmContent: alarm.alarmContent,
          alarmDate: newAlarmDate,
          isRead: false,
        });
      }
    }

    return updateTaskAlarmDto({ userId, ...updatedUser });
  }

  // ✅ 과제 알림 여부 설정
  async updateTaskAlarmStatus(userId, taskId, isAlarm) {
    if (!taskId || isNaN(parseInt(taskId))) {
      throw new BadRequestError(
        "INVALID_PARAMS",
        "params는 숫자로 보내야합니다.",
      );
    }

    // taskId가 유효한 숫자인지 확인
    if (!Number.isInteger(taskId) || taskId <= 0) {
      throw new BadRequestError(
        "INVALID_TASK_ID",
        "유효하지 않은 과제 ID입니다.",
      );
    }
    // 과제 존재 여부 및 소유권 확인
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        members: {
          where: { userId: userId },
        },
      },
    });

    if (!task) {
      throw new NotFoundError("TASK_NOT_FOUND", "과제를 찾을 수 없습니다.");
    }

    // 개인 과제인 경우 본인만, 팀 과제인 경우 멤버만 수정 가능
    const isOwner = task.members.some(
      (m) => m.userId === userId && m.role === false,
    );
    const isMember = task.members.some((m) => m.userId === userId);

    if (!isOwner && !isMember) {
      throw new ForbiddenError(
        "TASK_ACCESS_DENIED",
        "해당 과제에 접근할 권한이 없습니다.",
      );
    }

    if (typeof isAlarm !== "boolean") {
      throw new BadRequestError(
        "INVALID_BODY",
        "Body의 isAlarm 데이터는 boolean 형식으로 보내야합니다.",
      );
    }

    // 과제 알림 여부 설정 (Repository 호출)
    const updatedTask = await this.alarmRepository.updateTaskAlarmStatus(
      taskId,
      isAlarm,
    );

    // DTO 변환
    return updateTaskAlarmStatusDto(updatedTask);
  }

  // ✅ 세부과제 알림 여부 설정
  async updateSubtaskAlarmStatus(userId, subTaskId, isAlarm) {
    const subTask = await prisma.subTask.findUnique({
      where: { id: subTaskId },
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
    // 세부과제 존재 여부 확인
    if (!subTask) {
      throw new NotFoundError(
        "SUBTASK_NOT_FOUND",
        "요청하신 subTaskId가 DB에 존재하지 않습니다.",
      );
    }
    // 해당 과제의 멤버인지 확인
    const task = subTask.task;
    const isOwner = task.members.some(
      (m) => m.userId === userId && m.role === false,
    );
    const isMember = task.members.some((m) => m.userId === userId);

    if (!isOwner && !isMember) {
      throw new ForbiddenError(
        "SUBTASK_ACCESS_DENIED",
        "해당 세부과제에 접근할 권한이 없습니다.",
      );
    }

    const updatedSubTask = await this.alarmRepository.updateSubtaskAlarmStatus(
      subTaskId,
      isAlarm,
    );

    if (!updatedSubTask) {
      throw new NotFoundError(
        "SUBTASK_UPDATE_FAILED",
        "세부과제 업데이트에 실패했습니다.",
      );
    }

    const assignments = subTask.subTaskAssignees || [];
    const notifyAssignments = assignments.filter(
      (assignment) => assignment.member?.user?.id != null,
    );

    if (updatedSubTask.isAlarm === true) {
      if (notifyAssignments.length === 0) {
        throw new BadRequestError(
          "SUBTASK_NO_ASSIGNEE",
          "담당자가 지정된 세부과제만 알림을 켤 수 있습니다.",
        );
      }

      // 마감일이 미지정이면 알림 시각을 계산할 수 없습니다.
      // isAlarm 설정만 켜둔 채 알림 생성은 건너뛰고, 이후 마감일이 지정되면 그때 알림이 만들어집니다.
      if (!updatedSubTask.endDate) {
        await this.alarmRepository.deleteAlarmsBySubTaskIds([
          updatedSubTask.id,
        ]);
        return updateSubtaskAlarmStatusDto(updatedSubTask);
      }

      // 재생성 전 기존 알림을 지워 중복 생성을 막습니다.
      await this.alarmRepository.deleteAlarmsBySubTaskIds([updatedSubTask.id]);

      for (const assignment of notifyAssignments) {
        const assignee = assignment.member;
        const alarmHours =
          assignee.user?.alarmSetting?.taskAlarm ?? 24;
        const alarmDate = calculateAlarmDate(
          updatedSubTask.endDate,
          alarmHours,
        );

        await this.alarmRepository.createSubTaskAlarm(
          assignee.user.id,
          updatedSubTask.taskId,
          updatedSubTask.id,
          updatedSubTask.title,
          alarmDate,
        );
      }
    } else {
      await this.alarmRepository.deleteAlarmsBySubTaskIds([updatedSubTask.id]);
    }

    return updateSubtaskAlarmStatusDto(updatedSubTask);
  }

  // 알림 읽음 처리
  async updateAlarmReadStatus(userId, alarmId, isRead) {
    // 알림 존재 여부 확인
    const alarm = await this.alarmRepository.findAlarmById(alarmId);

    if (!alarm) {
      throw new NotFoundError("ALARM_NOT_FOUND", "알림을 찾을 수 없습니다.");
    }
    // 알림 소유자 확인 (본인의 알림인지)
    if (alarm.userId !== userId) {
      throw new ForbiddenError(
        "ALARM_ACCESS_DENIED",
        "해당 알림에 접근할 권한이 없습니다.",
      );
    }
    if (typeof isRead !== "boolean") {
      throw new BadRequestError(
        "INVALID_BODY",
        "Body의 isRead 데이터는 Boolean 형식으로 보내야합니다.",
      );
    }

    // 알림 읽음 처리 (Repository 호출)
    const updatedAlarm = await this.alarmRepository.updateAlarmReadStatus(
      alarmId,
      isRead,
    );
    return updateAlarmReadStatusDto({ userId, ...updatedAlarm });
  }

  // 모든 알림 읽음 처리
  async updateAllAlarmReadStatus(userId) {
    // 모든 알림 읽음 처리 (Repository 호출)
    const user = await checkDeletedUser(userId);
    // const updatedAlarms = await this.alarmRepository.updateAllAlarmReadStatus(userId);
    await this.alarmRepository.updateAllAlarmReadStatus(userId);
    if (!userId) {
      throw new NotFoundError("USER_NOT_FOUND", "사용자를 찾을 수 없습니다.");
    }
    if (user.deletedAt) {
      throw new ForbiddenError(
        "USER_DELETED",
        "탈퇴한 유저는 알림을 읽을 수 없습니다.",
      );
    }

    // return updateAllAlarmReadResponseDto(updatedAlarms);
    return null;
  }

  // 안읽은 알림 개수 확인
  async getUnreadAlarmCount(userId) {
    const user = await checkDeletedUser(userId);

    if (user.deletedAt) {
      throw new ForbiddenError(
        "USER_DELETED",
        "탈퇴한 유저는 알림을 조회할 수 없습니다.",
      );
    }

    if (!user) {
      throw new NotFoundError("USER_NOT_FOUND", "사용자를 찾을 수 없습니다.");
    }

    const count = await this.alarmRepository.countUnreadAlarms(userId);

    return {
      count,
      hasUnread: count > 0,
    };
  }

  // 디바이스 토큰 Redis 저장 서비스
  async registerDeviceToken(userId, fcmToken) {
    await redis.set(`fcm_token:${userId}`, fcmToken, "EX", 60 * 60 * 24 * 30);
    return null;
  }

  // 푸시 알림 테스트
  sendPushNotification = async (userId, title, body) => {
    // 1. Redis에서 토큰 꺼내기 
    const fcmToken = await redis.get(`fcm_token:${userId}`);
    
    if (!fcmToken) {
      throw new Error("FCM_TOKEN_NOT_FOUND");
    }

    // 2. 메시지 구조 조립
    const message = {
      notification: {
        title: title || "체크태스크 알림",
        body: body || "테스트 메시지입니다.",
      },
      token: fcmToken,
    };

    // 3. FCM 발송 후 결과 리턴
    const response = await getMessaging().send(message);
    return response;
  };
}

export default new AlarmService();
