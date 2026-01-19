export const createTaskRequestDTO = (data) => {
  return {
    title: data.title,
    folderId: data.folderId,
    deadline: new Date(data.deadline),
    type: data.type === "팀" ? "TEAM" : "PERSONAL", 
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

export const responseFromCompletedTasks = (tasks) => {
  return {
    tasks: tasks.map((task) => ({
      taskId: task.id,
      title: task.title,
      deadline: task.deadline ? new Date(task.deadline).toISOString().split('T')[0] : null,
      
      type: task.type === "TEAM" ? "팀" : "개인", 
      
      status: task.status,
      
      folderId: task.folder ? task.folder.id : null,
      folderTitle: task.folder ? task.folder.folderTitle : null,
      color: task.folder ? task.folder.color : null,
    })),
  };
};