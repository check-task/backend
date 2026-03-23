// 댓글 응답 DTO
export class CommentResponseDto {
  static from(comment) {
    return {
      comment_id: comment.id,
      sub_task_id: comment.subTask?.id,
      user_id: comment.user?.id,
      content: comment.content,
      created_at: comment.createdAt,
    };
  }
}
