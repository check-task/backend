import taskService from "../services/task.service.js";
import { createTaskRequestDTO } from "../dtos/task.dto.js";
import { updateTaskRequestDTO } from "../dtos/task.dto.js";
import { taskDetailResponseDTO } from "../dtos/task.dto.js";
import { taskListResponseDTO } from "../dtos/task.dto.js";

class TaskController {
  // 완료된 과제 조회
  async getCompletedTasks(req, res, next) {
    try {
      const userId = req.user.id;

      const result = await taskService.getCompletedTasks(userId);

      res.status(200).json({
        resultType: "SUCCESS",
        message: "완료된 과제 조회에 성공하였습니다.",
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // 과제 생성
  async createTask(req, res, next) {
    try {
      const userId = req.user.id; // 사용자 ID 가져오기
      const taskRequest = createTaskRequestDTO(req.body);

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
      const taskRequest = updateTaskRequestDTO(req.body);

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
        data: taskDetailResponseDTO(task)
      });
    } catch (error) {
      next(error);
    }
  }

  // 과제 목록 조회
  async getTasks(req, res, next) {
    try {
      console.log("쿼리 내용:", req.query);

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
        data: taskListResponseDTO(tasks)
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

  // 팀원 정보 수정
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
          member_id: result.id,
          user_id: result.userId,
          task_id: result.taskId,
          role: result.role ? 1 : 0,
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // 세부 TASK 완료 처리 API 
  async updateSubTaskStatus(req, res, next) {
    try {
      const { subTaskId } = req.params;
      const { status } = req.body;

      // 서비스 계층 호출
      const updatedTask = await taskService.updateSubTaskStatus(subTaskId, status);

      // 응답 형식에 맞게 데이터 가공
      const responseData = {
        resultType: 'SUCCESS',
        message: '태스크 상태가 업데이트되었습니다.',
        data: {
          sub_task_id: updatedTask.id,
          status: status === 'COMPLETE' ? '완료' : '미완료'
        }
      };

      return res.status(200).json(responseData);
    } catch (error) {
      next(error);
    }
  }

  // 세부task 날짜 변경 API
  async updateSubTaskDeadline(req, res, next) {
    try {
      const { subTaskId } = req.params;
      const { endDate } = req.body;

      // 서비스 계층 호출
      const updatedTask = await taskService.updateSubTaskDeadline(subTaskId, endDate);

      // 응답 형식에 맞게 데이터 가공
      const responseData = {
        resultType: 'SUCCESS',
        message: '마감 기한이 변경되었습니다.',
        data: {
          sub_task_id: updatedTask.id,
          end_date: updatedTask.endDate.toISOString().split('T')[0]
        }
      };

      return res.status(200).json(responseData);
    } catch (error) {
      console.error('Error in updateSubTaskDeadline:', {
        message: error.message,
        stack: error.stack,
        status: error.status,
        errorCode: error.errorCode
      });

      // 에러 객체에 상태 코드가 없으면 500으로 설정
      if (!error.status) {
        error.status = 500;
        error.errorCode = 'INTERNAL_SERVER_ERROR';
      }

      next(error);
    }
  }

  // 세부 TASK 담당자 설정 API
  async setSubTaskAssignee(req, res, next) {
    try {
      const { subTaskId } = req.params;
      const { assigneeId } = req.body;

      console.log('Request - subTaskId:', subTaskId, 'assigneeId:', assigneeId);

      const result = await taskService.setSubTaskAssignee(parseInt(subTaskId), assigneeId);

      console.log('Service result:', result);

      const responseData = {
        resultType: 'SUCCESS',
        message: '담당자가 지정되었습니다.',
        data: {
          sub_task_id: result.subTaskId,
          assignee_id: result.assigneeId
        }
      };

      return res.status(200).json(responseData);
    } catch (error) {
      console.error('Error in setSubTaskAssignee:', {
        message: error.message,
        stack: error.stack,
        statusCode: error.statusCode || error.status,
        errorCode: error.errorCode
      });

      // 에러 객체에 상태 코드가 없으면 500으로 설정
      if (!error.statusCode && !error.status) {
        error.statusCode = 500;
        error.errorCode = 'INTERNAL_SERVER_ERROR';
      } else if (error.status) {
        // 이전 버전과의 호환성을 위해 status가 있으면 statusCode로 복사
        error.statusCode = error.status;
      }

      next(error);
    }
  }

  // 초대 링크 생성
  async generateInviteCode(req, res, next) {
    try {
      const { taskId } = req.params;
      const userId = req.user.id; // 인증 미들웨어에서 설정된 사용자 ID

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

      if (!inviteCode || typeof inviteCode !== 'string') {
        return res.status(400).json({
          resultType: "FAIL",
          message: "초대 코드는 필수입니다.",
          data: null
        });
      }

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
