import { prisma } from '../db.config.js';

// 세부 TASK 완료 처리 API 

const updateSubTaskStatus = async (subTaskId, status) => {
  try {
    // 서브태스크 존재 여부 확인
    const existingTask = await prisma.SubTask.findUnique({
      where: { id: parseInt(subTaskId) },
    });

    if (!existingTask) {
      const error = new Error('해당하는 세부 태스크를 찾을 수 없습니다.');
      error.status = 404;
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
};

// 세부task 날짜 변경 API
const updateSubTaskDeadline = async (subTaskId, deadline) => {
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
      error.status = 404;
      throw error;
    }

    const newDeadline = new Date(deadline);
    const parentEndDate = new Date(existingTask.task.deadline);

    // 부모 태스크의 마감일을 초과하는지 확인
    if (newDeadline > parentEndDate) {
      const error = new Error('부모 Task의 마감일을 초과할 수 없습니다.');
      error.status = 400;
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
};

export const taskService = {
  updateSubTaskStatus,
  updateSubTaskDeadline,
};