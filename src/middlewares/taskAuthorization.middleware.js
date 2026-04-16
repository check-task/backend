import taskRepository from "../repositories/task.repository.js";
import { NotFoundError, ForbiddenError, BadRequestError } from "../errors/custom.error.js";

/**
 * [미들웨어 1] 과제 타입 + 권한 통합 인가 미들웨어
 * 용도: 상세 조회 등 URL(Personal/Team)과 실제 데이터 타입이 일치해야 할 때 사용
 
 * 과제 타입 인가 미들웨어
 * 쿼리 파라미터 ?type=PERSONAL 또는 ?type=TEAM으로 과제 타입 검증
 * 또한 사용자가 해당 과제의 멤버인지 확인
 */
export const validateTaskType = async (req, res, next) => {
  try {
    const taskId = parseInt(req.params.taskId, 10);// URL에서 과제 ID 추출
    const userId = req.user.id; // 로그인한 사용자 ID
    const expectedType = req.query.type?.toUpperCase(); // 프론트에서 보낸 기대 타입 (PERSONAL 또는 TEAM)

    // 1. 과제 ID 숫자 유효성 검사
    if (!taskId || isNaN(taskId)) {
      throw new NotFoundError("INVALID_TASK_ID", "유효하지 않은 과제 ID입니다.");
    }

    // 2. DB에 해당 과제 존재 여부 확인
    const task = await taskRepository.findTaskById(taskId);
    if (!task) {
      throw new NotFoundError("TASK_NOT_FOUND", "존재하지 않는 과제입니다.");
    }

    // 3. 과제 타입 일치 여부 검증 (쿼리 파라미터에 타입이 있는 경우만. 주소는 /personal인데 실제 과제는 TEAM인 경우 차단)
    if (expectedType && task.type !== expectedType) {
      const typeMessage = expectedType === "PERSONAL" 
        ? "개인 과제만 접근할 수 있습니다." 
        : "팀 과제만 접근할 수 있습니다.";
      throw new ForbiddenError("TASK_TYPE_MISMATCH", typeMessage);
    }

    // 4. 사용자가 이 과제의 멤버인지 확인
    const member = await taskRepository.findMemberInTask(taskId, userId);
    if (!member) {
      throw new ForbiddenError("FORBIDDEN_TASK", "해당 과제에 접근할 권한이 없습니다.");
    }

    // 5. 개인 과제 권한 체크 
    // PERSONAL 과제의 경우 소유자만 접근 가능
    if (task.type === "PERSONAL" && member.role !== false) {
      throw new ForbiddenError(
        "FORBIDDEN_PERSONAL_TASK",
        "개인 과제는 소유자만 접근할 수 있습니다.",
      );
    }

    // 요청 객체에 과제 정보 추가
    req.task = task;
    req.member = member;

    next();
  } catch (error) {
    next(error); // 에러 발생 시 에러 처리 미들웨어로 전달
  }
};

/**
 * [미들웨어 2] 과제 멤버 전용 검증 미들웨어
 * 용도: 타입 상관없이 "이 과제에 권한이 있는 유저인가"만 확인할 때 사용 (공통 수정/삭제 쪽에)
 * 
 * 과제 멤버만 검증하는 미들웨어 (타입 검증 없음)
 */
export const validateTaskMembership = async (req, res, next) => {
  try {
    const taskId = parseInt(req.params.taskId, 10);
    const userId = req.user.id;

    // 1. 과제 ID 숫자 유효성 검사
    if (!taskId || isNaN(taskId)) {
      throw new NotFoundError("INVALID_TASK_ID", "유효하지 않은 과제 ID입니다.");
    }

    // 2. 과제 존재 여부 확인
    const task = await taskRepository.findTaskById(taskId);
    if (!task) {
      throw new NotFoundError("TASK_NOT_FOUND", "존재하지 않는 과제입니다.");
    }

    // 3.멤버 확인
    const member = await taskRepository.findMemberInTask(taskId, userId);
    if (!member) {
      throw new ForbiddenError("FORBIDDEN_TASK", "해당 과제에 접근할 권한이 없습니다.");
    }

    // PERSONAL 과제의 경우 소유자만 접근 가능
    if (task.type === "PERSONAL" && member.role !== false) {
      throw new ForbiddenError(
        "FORBIDDEN_PERSONAL_TASK",
        "개인 과제는 소유자만 접근할 수 있습니다.",
      );
    }

    // 요청 객체에 과제 정보 추가
    req.task = task;
    req.member = member;

    next();
  } catch (error) {
    next(error);
  }
};
