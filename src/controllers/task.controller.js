import { taskService } from '../services/task.service.js';

const updateSubTaskStatus = async (req, res, next) => {
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
};

export const taskController = {
  updateSubTaskStatus,
};
