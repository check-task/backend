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
}

export default new TaskController();