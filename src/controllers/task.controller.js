import { taskService } from '../services/task.service.js';

// 세부 TASK 완료 처리 API 
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

// 세부task 날짜 변경 API
const updateSubTaskDeadline = async (req, res, next) => {
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
};

export const taskController = {
  updateSubTaskStatus,
  updateSubTaskDeadline,
};
