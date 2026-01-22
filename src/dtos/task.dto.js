export const createTaskRequestDTO = (data) => {
  return {
    title: data.title,
    folderId: data.folderId,
    deadline: new Date(data.deadline),
    type: data.type === "팀" ? "TEAM" : "PERSONAL",
    status: "PENDING",
    subTasks: (data.subTasks || []).map(st => ({
      title: st.title,
      endDate: new Date(st.deadline)
    })),
    references: data.references || []
  };
};

export const updateTaskRequestDTO = (data) => {
  return {
    title: data.title,
    folderId: data.folderId,
    deadline: data.deadline ? new Date(data.deadline) : undefined,
    type: data.type === "팀" ? "TEAM" : (data.type === "개인" ? "PERSONAL" : undefined),
    subTasks: (data.subTasks || []).map(st => ({
      title: st.title,
      endDate: new Date(st.deadline),
      status: st.status || "PENDING"
    })),
    references: data.references || []
  };
};

export const taskDetailResponseDTO = (task) => {
  // D-Day 계산 
  const today = new Date();
  const deadlineDate = new Date(task.deadline);
  const diffTime = deadlineDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const dDay = diffDays === 0 ? "D-Day" : diffDays > 0 ? `D-${diffDays}` : `D+${Math.abs(diffDays)}`;

  // 진행률 계산 (완료된 세부 과제 수 / 전체 세부 과제 수)
  const totalSubTasks = task.subTasks?.length || 0;
  const completedSubTasks = task.subTasks?.filter(st => st.status === 'COMPLETED').length || 0;
  const progressRate = totalSubTasks > 0 ? Math.round((completedSubTasks / totalSubTasks) * 100) : 0;

  return {
    taskId: task.id,
    title: task.title,
    type: task.type === "TEAM" ? "TEAM" : "INDIVIDUAL",
    deadline: task.deadline.toISOString().split('T')[0],
    dDay: dDay,
    progressRate: progressRate,
    subTasks: task.subTasks?.map(st => ({
      subTaskId: st.id,
      title: st.title,
      deadline: st.endDate?.toISOString().split('T')[0] || null,
      status: st.status === 'COMPLETED' ? 'COMPLETED' : 'PROGRASS',
      isAlarm: st.isAlarm || false,
      commentCount: st._count?.comments || 0,
      assigneeName: st.assigneeName || "PENDING"
    })) || [],
    communications: task.communications?.map(c => ({
      name: c.name,
      url: c.url
    })) || [],
    meetingLogs: task.logs?.map(log => ({
      logId: log.id,
      title: log.title
    })) || [],
    references: task.references?.map(r => ({
      name: r.name,
      url: r.url
    })) || []
  };
};

export const taskListResponseDTO = (tasks) => {
  return tasks.map(task => {
    // D-Day 계산
    const today = new Date();
    const deadlineDate = new Date(task.deadline);
    const diffTime = deadlineDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const dDay = diffDays === 0 ? "D-Day" : diffDays > 0 ? `D-${diffDays}` : `D+${Math.abs(diffDays)}`;

    return {
      taskId: task.id,
      folderId: task.folderId,
      folderTitle: task.folder?.title || "PENDING",
      title: task.title,
      type: task.type === "TEAM" ? "TEAM" : "INDIVIDUAL",
      deadline: task.deadline.toISOString().split('T')[0].replace(/-/g, '.'),
      dDay: dDay,
      progressRate: task.progressRate // 서비스에서 계산된 값 사용
    };
  });
};

export const responseFromCompletedTasks = (tasks) => {
  return {
    tasks: tasks.map((task) => ({
      taskId: task.id,
      title: task.title,
      deadline: task.deadline ? new Date(task.deadline).toISOString().split('T')[0] : null,

      type: task.type === "TEAM" ? "팀" : "개인",

      status: task.status === 'COMPLETED' ? '완료' : task.status,

      folderId: task.folder ? task.folder.id : null,
      folderTitle: task.folder ? task.folder.folderTitle : null,
      color: task.folder ? task.folder.color : null,
    })),
  };
};