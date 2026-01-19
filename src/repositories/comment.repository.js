import { prisma } from '../db.config.js'; //db접근

//댓글 db 접근 로직 
export class CommentRepository {
  static async findSubTaskById(subTaskId) {
    return prisma.subTask.findUnique({
      where: { id: parseInt(subTaskId) },
    });
  }
//유저 조회
  static async findUserById(userId) {
    return prisma.user.findUnique({
      where: { id: userId },
    });
  }
//댓글생성
  static async createComment(createCommentDto, subTaskId) {
    return prisma.comment.create({
      data: {
        //댓글내용
        content: createCommentDto.content,
        subTask: {
          connect: { id: parseInt(subTaskId) },
        },
        user: { //유저와 관계 설정
          connect: { id: createCommentDto.userId },
        },
      },
      //생성 후 응답에 필요한 연관 데이터 포함
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
          },
        },
        subTask: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });
  }

  // 댓글 조회 (ID로)
  static async findCommentById(commentId) {
    return prisma.comment.findUnique({
      where: { id: parseInt(commentId) },
      include: {
        user: {
          select: {
            id: true,
          },
        },
      },
    });
  }

  // 댓글 삭제
  static async deleteComment(commentId) {
    const comment = await this.findCommentById(commentId);
    if (!comment) {
      throw new Error('Comment not found');
    }
    return prisma.comment.delete({
      where: { id: parseInt(commentId) },
      include: {
        user: { select: { id: true } },
        subTask: { select: { id: true } }
      }
    });
  }

  // 댓글 조회
  static async findCommentById(commentId) {
    return prisma.comment.findUnique({
      where: { id: parseInt(commentId) },
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
          },
        },
      },
    });
  }

  // 댓글 수정
  static async updateComment(commentId, content) {
    return prisma.comment.update({
      where: { id: parseInt(commentId) },
      data: { content },
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
          },
        },
        subTask: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });
  }
}