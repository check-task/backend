import { prisma } from '../db.config.js';

// 댓글 관련 데이터베이스 접근 로직
export class CommentRepository {
  // SubTask 조회
  static async findSubTaskById(subTaskId) {
    try {
      return await prisma.subTask.findUnique({
        where: { id: parseInt(subTaskId) }
      });
    } catch (error) {
      console.error('Error finding subTask:', error);
      throw new Error('서버 오류가 발생했습니다.');
    }
  }

  // User 조회
  static async findUserById(userId) {
    try {
      return await prisma.user.findUnique({
        where: { id: userId }
      });
    } catch (error) {
      console.error('Error finding user:', error);
      throw new Error('서버 오류가 발생했습니다.');
    }
  }

  // 댓글 생성
  static async createComment(createCommentDto, subTaskId) {
    try {
      return await prisma.comment.create({
        data: {
          content: createCommentDto.content,
          subTask: { connect: { id: parseInt(subTaskId) } },
          user: { connect: { id: createCommentDto.userId } }
        },
        select: {
          id: true,
          content: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              nickname: true
            }
          },
          subTask: {
            select: {
              id: true,
              title: true
            }
          }
        }
      });
    } catch (error) {
      console.error('Error creating comment:', error);
      throw new Error('댓글 생성 중 오류가 발생했습니다.');
    }
  }

  // 댓글 조회 (ID로)
  static async findCommentById(commentId) {
    try {
      return await prisma.comment.findUnique({
        where: { id: parseInt(commentId) },
        include: {
          user: {
            select: {
              id: true,
              nickname: true
            }
          },
          subTask: {
            select: {
              id: true,
              title: true
            }
          }
        }
      });
    } catch (error) {
      console.error('Error finding comment:', error);
      throw new Error('댓글 조회 중 오류가 발생했습니다.');
    }
  }

  // 댓글 수정
  static async updateComment(commentId, content) {
    try {
      return await prisma.comment.update({
        where: { id: parseInt(commentId) },
        data: { content },
        include: {
          user: {
            select: {
              id: true,
              nickname: true
            }
          },
          subTask: {
            select: {
              id: true,
              title: true
            }
          }
        }
      });
    } catch (error) {
      console.error('Error updating comment:', error);
      throw new Error('댓글 수정 중 오류가 발생했습니다.');
    }
  }

  // 댓글 삭제
  static async deleteComment(commentId) {
    try {
      return await prisma.comment.delete({
        where: { id: parseInt(commentId) }
      });
    } catch (error) {
      console.error('Error deleting comment:', error);
      throw new Error('댓글 삭제 중 오류가 발생했습니다.');
    }
  }
}