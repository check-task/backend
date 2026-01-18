//댓글 생성 요청 DTO
export class CreateCommentDto {
  constructor(data) {
    this.userId = data.user_id; //댓글 작성한 사용자 id
    this.content = data.content; //댓글 내용
  }

  //dto를 entity 형태로 변환
  toEntity() {
    return {
      user_id: this.userId,
      content: this.content,
    };
  }
}

//댓글 조회/응답 dto
export class CommentResponseDto {
  static from(comment) {
    return {
      comment_id: comment.id,
      sub_task_id: comment.subTask?.id,
      user_id: comment.user?.id,
      content: comment.content,
      created_at: comment.created_at,
    };
  }
}