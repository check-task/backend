import taskService from "../services/task.service.js";
import { TaskRequestDTO, TaskResponseDTO } from "../dtos/task.dto.js";

class TaskController {
  // 완료된 과제 조회
  async getCompletedTasks(req, res, next) {
    try {
      const userId = req.user.id;
      const result = await taskService.getCompletedTasks(userId);

      res.status(200).json({
        resultType: "SUCCESS",
        message: "완료된 과제 조회에 성공하였습니다.",
        data: TaskResponseDTO.fromCompleted(result)
      });
    } catch (error) {
      next(error);
    }
  }

  // 과제 생성
  async createTask(req, res, next) {
    try {
      const userId = req.user.id;
      const taskRequest = TaskRequestDTO.toCreate(req.body);

      const result = await taskService.registerTask(userId, taskRequest);

      res.status(201).json({
        resultType: "SUCCESS",
        message: "요청이 처리되어서 새로운 과제가 생성되었습니다.",
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // 과제 수정
  async updateTask(req, res, next) {
    try {
      const { taskId } = req.params;
      const taskRequest = TaskRequestDTO.toUpdate(req.body);

      const result = await taskService.modifyTask(parseInt(taskId), taskRequest);

      res.status(200).json({
        resultType: "SUCCESS",
        message: "요청이 성공적으로 처리되었습니다.",
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // 과제 삭제
  async deleteTask(req, res, next) {
    try {
      const { taskId } = req.params;
      await taskService.removeTask(parseInt(taskId));

      res.status(200).json({
        resultType: "SUCCESS",
        message: "과제가 성공적으로 삭제되었습니다.",
        data: null
      });
    } catch (error) {
      next(error);
    }
  }

  // 과제 세부 사항 조회
  async getTaskDetail(req, res, next) {
    try {
      const { taskId } = req.params;
      const task = await taskService.getTaskDetail(parseInt(taskId));

      res.status(200).json({
        resultType: "SUCCESS",
        message: "서버가 요청을 성공적으로 처리하였습니다.",
        // static 메서드 fromDetail 사용
        data: TaskResponseDTO.fromDetail(task)
      });
    } catch (error) {
      next(error);
    }
  }

  // 과제 목록 조회
  async getTasks(req, res, next) {
    try {
      const queryParams = {
        type: req.query.type,
        sort: req.query.sort,
        folderId: req.query.folderId || req.query.folder_id || req.query.folderld,
      };
      const userId = req.user.id;

      const tasks = await taskService.getTaskList(userId, queryParams);

      res.status(200).json({
        resultType: "SUCCESS",
        message: "서버가 요청을 성공적으로 처리하였습니다.",
        data: TaskResponseDTO.fromList(tasks)
      });
    } catch (error) {
      next(error);
    }
  }

  // 우선 순위 변경
  async updateTaskPriorities(req, res, next) {
    try {
      const userId = req.user.id;
      const { orderedTasks } = req.body;

      await taskService.updatePriorities(userId, orderedTasks);

      res.status(200).json({
        resultType: "SUCCESS",
        message: "과제 우선순위가 일괄 변경되었습니다.",
        data: null
      });
    } catch (error) {
      next(error);
    }
  }

  // 팀원 정보 수정 (역할 변경)
  async updateTeamMember(req, res, next) {
    try {
      const { taskId, memberId } = req.params;
      const { role } = req.body;

      const result = await taskService.modifyMemberRole(
        parseInt(taskId),
        parseInt(memberId),
        role
      );

      res.status(200).json({
        resultType: "SUCCESS",
        message: "요청이 성공적으로 처리되었습니다.",
        data: {
          memberId: result.id,
          userId: result.userId,
          taskId: result.taskId,
          role: result.role ? 1 : 0,
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // 세부 TASK 상태 업데이트
  async updateSubTaskStatus(req, res, next) {
    try {
      const { subTaskId } = req.params;
      const { status } = req.body;

      const updatedTask = await taskService.updateSubTaskStatus(subTaskId, status);

      res.status(200).json({
        resultType: 'SUCCESS',
        message: '태스크 상태가 업데이트되었습니다.',
        data: {
          sub_task_id: updatedTask.id,
          status: status === 'COMPLETED' ? '완료' : '미완료'
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // 세부 TASK 날짜 변경
  async updateSubTaskDeadline(req, res, next) {
    try {
      const { subTaskId } = req.params;
      const { endDate } = req.body;

      const updatedTask = await taskService.updateSubTaskDeadline(subTaskId, endDate);

      res.status(200).json({
        resultType: 'SUCCESS',
        message: '마감 기한이 변경되었습니다.',
        data: {
          sub_task_id: updatedTask.id,
          end_date: updatedTask.endDate.toISOString().split('T')[0]
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // 세부 TASK 담당자 설정
  async setSubTaskAssignee(req, res, next) {
    try {
      const { subTaskId } = req.params;
      const { assigneeId } = req.body;

      const result = await taskService.setSubTaskAssignee(parseInt(subTaskId), assigneeId);

      res.status(200).json({
        resultType: 'SUCCESS',
        message: '담당자가 지정되었습니다.',
        data: {
          sub_task_id: result.subTaskId,
          assignee_id: result.assigneeId
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // 초대 링크 생성
  async generateInviteCode(req, res, next) {
    try {
      const { taskId } = req.params;
      const userId = req.user.id;

      const result = await taskService.generateInviteCode(parseInt(taskId), userId);

      res.status(200).json({
        resultType: "SUCCESS",
        message: "초대 링크가 생성되었습니다.",
        data: {
          invite_code: result.invite_code,
          invite_expired: result.invite_expired
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // 초대 코드로 팀 참여
  async joinTaskByInviteCode(req, res, next) {
    try {
      const userId = req.user.id;
      const { inviteCode } = req.body;

      const result = await taskService.joinTaskByInviteCode(userId, inviteCode);

      res.status(200).json({
        resultType: "SUCCESS",
        message: "팀에 성공적으로 참여했습니다.",
        data: {
          task_id: result.taskId,
          task_title: result.taskTitle,
          member_id: result.memberId
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new TaskController();
