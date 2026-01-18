import { prisma } from '../db.config.js';

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

export const taskService = {
  updateSubTaskStatus,
};