import taskService from "../services/task.service.js";
import { uploadToS3 } from '../middlewares/upload.middleware.js';
import { TaskRequestDTO, TaskResponseDTO } from "../dtos/task.dto.js";
import { BadRequestError } from "../errors/custom.error.js";

class TaskController {
  // 완료 과제 조회
  async getCompletedTasks(req, res, next) {
    try {
      const userId = req.user.id;

      const tasksRaw = await taskService.getCompletedTasks(userId);

      res.status(200).json({
        resultType: "SUCCESS",
        message: "완료된 과제 조회 성공",
        data: TaskResponseDTO.fromCompleted(tasksRaw)
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
    
    let customFileNames = [];
    if (req.body.fileNames) {
      const rawNames = req.body.fileNames;
      if (typeof rawNames === 'string' && rawNames.startsWith('[')) {
        customFileNames = JSON.parse(rawNames);
      } else if (typeof rawNames === 'string') {
        customFileNames = rawNames.split(',').map(name => name.trim());
      } else {
        customFileNames = rawNames; 
      }
    }

    let fileReferences = [];
    if (req.files && req.files.length > 0) {
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        const fileUrl = await uploadToS3(file);
        
        fileReferences.push({
          name: (customFileNames && customFileNames[i]) ? customFileNames[i] : file.originalname, 
          fileUrl: fileUrl
        });
      }
    }

    const taskRequest = TaskRequestDTO.toUpdate(req.body, fileReferences);
    const result = await taskService.modifyTask(parseInt(taskId), taskRequest);

    res.status(200).json({
      resultType: "SUCCESS",
      message: "과제가 성공적으로 수정되었습니다.",
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
        status: req.query.status
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
  // Task 마감일 변경
  async updateTaskDeadline(req, res, next) {
    try {
      const { taskId } = req.params;
      const { deadline } = req.body;
      const userId = req.user.id; // 유저 ID 추출

      // 입력값 검증
      if (!taskId || isNaN(parseInt(taskId))) {
        // throw new Error("유효하지 않은 Task ID입니다.");
        throw new BadRequestError("INVALID_PARAMETER", "유효하지 않은 Task ID입니다.");
      }
      if (!deadline) {
        throw new BadRequestError("INVALID_BODY", "마감일은 필수입니다.");
      }

      const updatedTask = await taskService.updateTaskDeadline(userId, parseInt(taskId), deadline);

      res.status(200).json({
        resultType: "SUCCESS",
        message: "Task 마감일이 성공적으로 변경되었습니다.",
        data: {
          taskId: updatedTask.id,
          deadline: updatedTask.deadline,
        }
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

  async updateTeamMember(req, res, next) {
    try {
      const { taskId, userId } = req.params;
      const { role } = req.body; // 프론트에서 0(Owner) 또는 1(Member)이 옴

      const result = await taskService.modifyMemberRole(
        parseInt(taskId),
        parseInt(userId),
        role
      );

      res.status(200).json({
        resultType: "SUCCESS",
        message: "멤버 권한이 변경되었습니다.",
        data: {
          memberId: result.id,
          userId: result.userId,
          taskId: result.taskId,
          // 📍 DB가 false(0)면 0(Owner), true(1)면 1(Member) 반환
          role: result.role ? 1 : 0 
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
  async updateSubTaskDeadline(req, res) {
    // try {
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
    // } catch (error) {
    //   next(error);
    // }
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

  // 세부 과제 추가
  async addSubTask(req, res, next) {
    try {
      const { taskId } = req.params;
      const userId = req.user.id;

      const result = await taskService.createSingleSubTask(userId, parseInt(taskId), req.body);

      res.status(200).json({
        resultType: "SUCCESS",
        message: "세부 Task가 성공적으로 추가되었습니다.",
        data: {
          subTaskId: result.id,
          title: result.title,
          deadline: result.endDate,
        }
      });
    } catch (error) {
      next(error);
    }
  }
}



export default new TaskController();
