import taskService from "../services/task.service.js";
import { uploadToS3 } from "../middlewares/upload.middleware.js";
import { TaskRequestDTO, TaskResponseDTO } from "../dtos/task.dto.js";
import taskRepository from "../repositories/task.repository.js";
import { NotFoundError, BadRequestError } from "../errors/custom.error.js";

class TaskController {
  // 완료 과제 조회
  async getCompletedTasks(req, res, next) {
    try {
      const userId = req.user.id;

      const tasksRaw = await taskService.getCompletedTasks(userId);

      res.status(200).json({
        resultType: "SUCCESS",
        message: "완료된 과제 조회 성공",
        data: TaskResponseDTO.fromCompleted(tasksRaw, userId),
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
      console.log(taskRequest);

      const uploadedFiles = await Promise.all(
        (req.files || []).map(async (file) => ({
          originalname: file.originalname,
          location: await uploadToS3(file),
        }))
      );

      const result = await taskService.registerTask(userId, taskRequest, uploadedFiles);

      res.status(201).json({
        resultType: "SUCCESS",
        message: "요청이 처리되어서 새로운 과제가 생성되었습니다.",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // 과제 수정
  async updateTask(req, res, next) {
    try {
      const userId = req.user.id;
      const { taskId } = req.params;
      
      if (!req.body || Object.keys(req.body).length === 0) {
        throw new BadRequestError("DATA_NOT_PROVIDED", "수정할 데이터가 전달되지 않았습니다.");
      }

      const taskRequest = TaskRequestDTO.toUpdate(req.body);

      const uploadedFiles = await Promise.all(
        (req.files || []).map(async (file) => ({
          originalname: file.originalname,
          location: await uploadToS3(file),
        }))
      );
      const result = await taskService.modifyTask(parseInt(taskId), userId, taskRequest, uploadedFiles);

      res.status(200).json({
        resultType: "SUCCESS",
        message: "과제가 성공적으로 수정되었습니다.",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // 과제 세부 사항 조회
  async getTaskDetail(req, res, next) {
    try {
      const { taskId } = req.params;
      const userId = req.user.id;
      
      const task = await taskService.getTaskDetail(taskId, userId);

      res.status(200).json({
        resultType: "SUCCESS",
        message: "서버가 요청을 성공적으로 처리하였습니다.",
        // static 메서드 fromDetail 사용
        data: TaskResponseDTO.fromDetail(task),
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
        folderId:
          req.query.folderId || req.query.folder_id || req.query.folderld,
        status: req.query.status,
      };
      const userId = req.user.id;

      const tasks = await taskService.getTaskList(userId, queryParams);

      res.status(200).json({
        resultType: "SUCCESS",
        message: "서버가 요청을 성공적으로 처리하였습니다.",
        data: TaskResponseDTO.fromList(tasks),
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

      const updatedTask = await taskService.updateTaskDeadline(
        userId,
        taskId,
        deadline,
      );

      res.status(200).json({
        resultType: "SUCCESS",
        message: "Task 마감일이 성공적으로 변경되었습니다.",
        data: {
          taskId: updatedTask.id,
          deadline: updatedTask.deadline,
        },
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
        data: null,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateTeamMember(req, res, next) {
    try {
      const { taskId, userId } = req.params;
      const { role } = req.body; // 프론트에서 0(Owner) 또는 1(Member)이 옴

      const result = await taskService.modifyMemberRole(taskId, userId, role);

      res.status(200).json({
        resultType: "SUCCESS",
        message: "멤버 권한이 변경되었습니다.",
        data: {
          memberId: result.id,
          userId: result.userId,
          taskId: result.taskId,
          // 📍 DB가 false(0)면 0(Owner), true(1)면 1(Member) 반환
          role: result.role ? 1 : 0,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // 팀원 추방
  async deleteTeamMember(req, res, next) {
    try {
      const { taskId, memberId } = req.params;
      const userId = req.user.id;

      const result = await taskService.outMember(taskId, memberId, userId);

      res.status(200).json({
        resultType: "SUCCESS",
        message: `memberId: ${memberId}가 추방되었습니다.`,
        data: result,
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
      const userId = req.user.id;

      const updatedTask = await taskService.updateSubTaskStatus(
        subTaskId,
        status,
        userId,
      );

      res.status(200).json({
        resultType: "SUCCESS",
        message: "태스크 상태가 업데이트되었습니다.",
        data: {
          sub_task_id: updatedTask.id,
          status: status === "COMPLETED" ? "완료" : "미완료",
        },
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
      const userId = req.user.id;

      const updatedTask = await taskService.updateSubTaskDeadline(
        subTaskId,
        endDate,
        userId,
      );

      res.status(200).json({
        resultType: "SUCCESS",
        message: "마감 기한이 변경되었습니다.",
        data: {
          sub_task_id: updatedTask.id,
          end_date: updatedTask.endDate.toISOString().split("T")[0],
        },
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
      const userId = req.user.id;

      const result = await taskService.setSubTaskAssignee(
        subTaskId,
        assigneeId,
        userId,
      );

      res.status(200).json({
        resultType: "SUCCESS",
        message: "담당자가 지정되었습니다.",
        data: {
          sub_task_id: result.subTaskId,
          assignee_id: result.assigneeId,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // 초대 코드 생성
  async generateInviteCode(req, res, next) {
    try {
      const { taskId } = req.params;
      const userId = req.user.id;

      const task = await taskRepository.findTaskById(taskId);
      if (!task) {
        throw new NotFoundError("TASK_NOT_FOUND", "과제를 찾을 수 없습니다.");
      }

      let result;

      const check = await taskService.checkInviteCode(task);

      console.log(check.isValid);

      if (check.isValid) {
        result = {
          invite_code: check.invite_code,
          invite_expired: check.invite_expired
        };
      } else {
        result = await taskService.generateInviteCode(task, userId);
      }

      res.status(200).json({
        resultType: "SUCCESS",
        message: "초대 코드 반환 완료.",
        data: {
          invite_code: result.invite_code,
          invite_expired: result.invite_expired,
        },
      });
    } catch (error) {
      console.error(error);
      next(error);
    }
  }

  // 초대 코드로 팀 참여
  async joinTaskByInviteCode(req, res, next) {
    try {
      const userId = req.user.id;
      const { folderId = null, inviteCode } = req.body;

      const result = await taskService.joinTaskByInviteCode(userId, folderId, inviteCode);

      res.status(200).json({
        resultType: "SUCCESS",
        message: "팀에 성공적으로 참여했습니다.",
        data: {
          task_id: result.taskId,
          task_title: result.taskTitle,
          member_id: result.memberId,
          folderId: result.folderId
        },
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
      const dto = TaskRequestDTO.toCreateSubTask(req.body);

      const result = await taskService.createSingleSubTask(
        userId,
        taskId,
        dto,
      );

      res.status(200).json({
        resultType: "SUCCESS",
        message: "세부 Task가 성공적으로 추가되었습니다.",
        data: {
          subTaskId: result.subTaskId,
          title: result.title,
          deadline: result.deadline,
        },
      });
    } catch (error) {
      next(error);
    }
  }
  
  // 세부 과제 수정
  async patchSubTask(req, res, next) {
    try {
      const userId = req.user.id;
      const { taskId } = req.params;
      const { subTasks } = req.body;
      
      const dtoList = subTasks.map(({ subTaskId, ...rest }) => ({
        subTaskId: Number(subTaskId),
        ...TaskRequestDTO.toSubUpdate(rest),
      }));


      const result = await taskService.updateSelectedSubTasks(  // 메서드 이름 수정
        userId,
        Number(taskId),
        dtoList 
      );

      res.status(200).json({
        resultType: "SUCCESS",
        message: "세부 Task가 성공적으로 수정되었습니다.",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // 세부 과제 선택 삭제
  async deleteSubTask(req, res, next) {
    try {
      const { taskId } = req.params;
      const userId = req.user.id;
      const { subTaskIds } = req.body;
      if (!Array.isArray(subTaskIds)) { throw new Error("subTaskIds는 배열이어야 합니다."); }
  
      const result = await taskService.deleteSelectedSubTasks(
        userId,
        Number(taskId),
        subTaskIds.map(Number)
      );
  
      res.status(200).json({
        resultType: "SUCCESS",
        message: "선택한 세부 과제들이 삭제되었습니다.",
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // 세부 과제 전체 삭제
  async allDeleteSubTask(req, res, next) {
    try {
      const { taskId } = req.params;
      const userId = req.user.id;
  
      const result = await taskService.deleteAllSubTasks(
        userId,
        Number(taskId)
      );
  
      res.status(200).json({
        resultType: "SUCCESS",
        message: "선택한 과제에 대한 세부 과제가 삭제되었습니다.",
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new TaskController();
