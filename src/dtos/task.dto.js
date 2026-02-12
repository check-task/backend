class TaskUtils {
  // 공통 로직
  // D-Day 계산
  static calculateDDay(deadline) {
    if (!deadline) return null;

    // 서버 시간(UTC)을 한국 시간(+9)으로 변환
    const now = new Date();
    const kstNow = new Date(now.getTime() + (9 * 60 * 60 * 1000));
    // 한국 날짜의 '0시 0분 0초'로 세팅
    const today = new Date(kstNow.getFullYear(), kstNow.getMonth(), kstNow.getDate());

    // 마감일(UTC)을 한국 시간(+9)으로 변환
    const dDate = new Date(deadline);
    const kstDeadline = new Date(dDate.getTime() + (9 * 60 * 60 * 1000));
    // 마감 날짜의 '0시 0분 0초'로 세팅
    const targetDay = new Date(kstDeadline.getFullYear(), kstDeadline.getMonth(), kstDeadline.getDate());

    // 두 날짜의 차이 계산
    const diffTime = targetDay - today;
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "D-Day";
    return diffDays > 0 ? `D-${diffDays}` : `D+${Math.abs(diffDays)}`;
  }

  // KST 기준 날짜 포맷 (YYYY.MM.DD)
  static formatDate(date, separator = '.') {
    if (!date) return null;

    // 입력받은 날짜(UTC)를 한국 시간으로 변환
    const targetDate = new Date(date);
    const kstDate = new Date(targetDate.getTime() + (9 * 60 * 60 * 1000));

    const year = kstDate.getUTCFullYear();
    const month = String(kstDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(kstDate.getUTCDate()).padStart(2, '0');

    return `${year}${separator}${month}${separator}${day}`;
  }
}

// Request DTO 
export class TaskRequestDTO {
  // 과제 생성
  static toCreate(data) {
    return {
      title: data.title,
      folderId: data.folderId,
      deadline: data.deadline ? new Date(data.deadline) : new Date(),
      type: data.type === "TEAM" ? "TEAM" : "PERSONAL",
      status: "PENDING",
      subTasks: (data.subTasks || []).map(st => ({
        title: st.title,
        endDate: st.endDate ? new Date(st.endDate) : new Date()
      })),
      references: data.references || []
    };
  }

  // 과제 수정
  static toUpdate(data) {
    return {
      title: data.title,
      folderId: data.folderId,
      deadline: data.deadline ? new Date(data.deadline) : undefined,
      type: data.type === "TEAM" ? "TEAM" : (data.type === "PERSONAL" ? "PERSONAL" : undefined),
      subTasks: (data.subTasks || []).map(st => ({
        title: st.title,
        endDate: st.endDate ? new Date(st.endDate) : new Date(),
        status: st.status || "PENDING"
      })),
      references: data.references || []
    };
  }
}

// Response DTO
export class TaskResponseDTO extends TaskUtils {
  // 상세 조회 응답
  static fromDetail(task) {
    const totalSubTasks = task.subTasks?.length || 0;
    const completedSubTasks = task.subTasks?.filter(st => st.status === 'COMPLETED').length || 0;
    const progressRate = totalSubTasks > 0 ? Math.round((completedSubTasks / totalSubTasks) * 100) : 0;

    return {
      taskId: task.id,
      title: task.title,
      folderId: task.folderId,
      foldercolor: task.folder?.color || "값 없음",
      folderTitle: task.folder?.folderTitle || "미지정",
      status: task.status || "PENDING",
      type: task.type === "TEAM" ? "TEAM" : "PERSONAL",
      deadline: this.formatDate(task.deadline, '-'),
      dDay: this.calculateDDay(task.deadline),
      progressRate: progressRate,
      subTasks: task.subTasks?.map(st => ({
        subTaskId: st.id,
        title: st.title,
        deadline: this.formatDate(st.endDate, '-'),
        status: st.status === 'COMPLETED' ? 'COMPLETED' : 'PROGRESS',
        isAlarm: st.isAlarm || false,
        commentCount: st._count?.comments || 0,
        comments: st.comments?.map(comment => ({
          commentId: comment.id,
          content: comment.content,
          writer: comment.user?.nickname || "미지정",
          profileImage: comment.user?.profileImage || null,
          createdAt: comment.createdAt
        })) || [],
        assigneeId: st.assignee?.id || null,
        assigneeName: st.assignee?.nickname || "PENDING",
        assigneeProfileImage: st.assignee?.profileImage || null
      })) || [],
      communications: task.communications?.map(c => ({ ...c })) || [],
      meetingLogs: task.logs?.map(log => ({ ...log })) || [],
      references: task.references?.map(r => ({ ...r })) || []
    };
  }

  // 목록 조회 응답
  static fromList(tasks) {
    const taskList = [];
    const subTaskList = [];

    (Array.isArray(tasks) ? tasks : []).forEach(task => {
      // 1. Task 정보 추출
      taskList.push({
        taskId: task.id,
        folderId: task.folderId,
        foldercolor: task.folder?.color || "값 없음",
        folderTitle: task.folder?.folderTitle || "미지정",
        priority: task.priorities?.[0]?.rank ?? null,
        status: task.status || "PENDING",
        title: task.title,
        type: task.type === "TEAM" ? "TEAM" : "PERSONAL",
        deadline: this.formatDate(task.deadline),
        dDay: this.calculateDDay(task.deadline),
        progressRate: task.progress || 0
      });

      // 2. SubTask 정보 추출 및 평탄화 (Flatten)
      if (task.subTasks && task.subTasks.length > 0) {
        task.subTasks.forEach(st => {
          subTaskList.push({
            subTaskId: st.id,
            taskId: task.id, // 어떤 과제의 세부과제인지 식별할 수 있도록 taskId 포함
            title: st.title,
            status: st.status || "PENDING",
            // 필요한 경우 마감일 등 추가
            deadline: this.formatDate(st.endDate)
          });
        });
      }
    });

    // 3. 분리된 구조로 반환
    return {
      task: taskList,
      subTask: subTaskList
    };
  }

  // 완료 과제 조회 응답
  static fromCompleted(tasks) {
    return {
      tasks: tasks.map(task => ({
        taskId: task.id,
        title: task.title,
        deadline: this.formatDate(task.deadline, '-'),
        type: task.type === "PERSONAL" ? "개인" : "팀",
        status: task.status === 'COMPLETED' ? '완료' : '미완료',
        folderId: task.folder?.id || null,
        folderTitle: task.folder?.folderTitle || null,
        color: task.folder?.color || "#000000",
      }))
    };
  }
}