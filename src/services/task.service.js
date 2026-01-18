import taskRepository from "../repositories/task.repository.js";
import { BadRequestError, NotFoundError } from "../errors/custom.error.js";
import { prisma } from "../db.config.js";

class TaskService {
  // 과제 등록
  async registerTask(data) {
    const { subTasks, references, folderId, ...taskData } = data;

    if (!taskData.title) throw new BadRequestError("과제명은 필수입니다.");

    const folder = await taskRepository.findFolderById(folderId);
    if (!folder) throw new NotFoundError("존재하지 않는 폴더입니다.");

    return await prisma.$transaction(async (tx) => {
      // 과제 생성
      const newTask = await taskRepository.createTask({ ...taskData, folderId }, tx);

      // 하위 데이터 저장
      if (subTasks.length > 0) {
        await taskRepository.addSubTasks(newTask.id, subTasks, tx);
      }
      if (references.length > 0) {
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

    // 폴더 변경 시 유효성 체크
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
}

export default new TaskService();