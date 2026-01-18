import taskService from "../services/task.service.js";
import { createTaskRequestDTO } from "../dtos/task.dto.js";
import { updateTaskRequestDTO } from "../dtos/task.dto.js";

class TaskController {
  async createTask(req, res, next) {
    try {
      const taskRequest = createTaskRequestDTO(req.body);
      
      const result = await taskService.registerTask(taskRequest);

      res.status(201).json({
        resultType: "SUCCESS",
        message: "요청이 처리되어서 새로운 과제가 생성되었습니다.",
        data: result
      });
    } catch (error) {
      next(error); 
    }
  }

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
  async updateSubTaskDeadline(req, res, next){
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
      next(error);
    }
  }
}

export default new TaskController();
