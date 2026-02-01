class TaskUtils {
  // 공통 로직
  // D-Day 계산
  static calculateDDay(deadline) {
    if (!deadline) return null;
    const today = new Date();
    const deadlineDate = new Date(deadline);
    const diffTime = deadlineDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "D-Day";
    return diffDays > 0 ? `D-${diffDays}` : `D+${Math.abs(diffDays)}`;
  }

  // 날짜 포맷 
  static formatDate(date, separator = '.') {
    if (!date) return null;
    const dateStr = date instanceof Date ? date.toISOString() : new Date(date).toISOString();
    return dateStr.split('T')[0].replace(/-/g, separator);
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
      type: data.type === "팀" ? "TEAM" : (data.type === "개인" ? "PERSONAL" : undefined),
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
        assigneeName: st.assigneeName || "PENDING"
      })) || [],
      communications: task.communications?.map(c => ({ name: c.name, url: c.url })) || [],
      meetingLogs: task.logs?.map(log => ({ logId: log.id, title: log.title })) || [],
      references: task.references?.map(r => ({ name: r.name, url: r.url })) || []
    };
  }

  // 목록 조회 응답
  static fromList(tasks) {
    return (Array.isArray(tasks) ? tasks : []).map(task => ({
      taskId: task.id,
      folderId: task.folderId,
      folderTitle: task.folder?.title || "PENDING",
      title: task.title,
      type: task.type === "TEAM" ? "TEAM" : "PERSONAL",
      deadline: this.formatDate(task.deadline),
      dDay: this.calculateDDay(task.deadline),
      progressRate: task.progress || 0
    }));
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
        folderTitle: task.folder?.folderTitle || "미지정",
        color: task.folder?.color || "#000000",
      }))
    };
  }
}