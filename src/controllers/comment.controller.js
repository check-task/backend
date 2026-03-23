import { CommentService } from "../services/comment.service.js";

// 댓글 생성 컨트롤러
export const createCommentController = async (req, res, next) => {
  try {
    const { subTaskId } = req.params;
    const { content } = req.body;

    const result = await CommentService.createComment(subTaskId, {
      userId: req.user.id,
      content,
    });

    res.status(201).json({
      resultType: "SUCCESS",
      message: "댓글이 등록되었습니다.",
      data: {
        comment_id: result.comment_id,
        sub_task_id: result.sub_task_id,
        content: result.content,
        created_at: result.created_at,
      },
    });
  } catch (error) {
    next(error);
  }
};

// 댓글 수정 컨트롤러
export const updateCommentController = async (req, res, next) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    const result = await CommentService.updateComment(
      commentId,
      userId,
      content,
    );

    res.status(200).json({
      resultType: "SUCCESS",
      message: "댓글이 수정되었습니다.",
      data: {
        comment_id: result.comment_id,
        content: result.content,
      },
    });
  } catch (error) {
    next(error);
  }
};

// 댓글 삭제 컨트롤러
export const deleteCommentController = async (req, res, next) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.id;

    await CommentService.deleteComment(commentId, userId);

    res.status(200).json({
      resultType: "SUCCESS",
      message: "댓글이 삭제되었습니다.",
      data: null,
    });
  } catch (error) {
    next(error);
  }
};
