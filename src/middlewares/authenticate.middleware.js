import jwt from 'jsonwebtoken';
import { BadRequestError, UnauthorizedError } from '../errors/custom.error.js';

export default function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedError("TOKEN_NOT_FOUND", "인증 토큰이 없습니다.");
    }

    if (!authHeader.startsWith('Bearer ')) {
      throw new BadRequestError("BAD_REQUEST", "인증 토큰이 형식에 맞지 않습니다.");
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET;

    const decoded = jwt.verify(token, secret);
    if (!decoded.id) {
      throw new UnauthorizedError('유효하지 않은 토큰입니다.');
    }

    const userIdInt = parseInt(decoded.id, 10);
    if (isNaN(userIdInt)) {
      throw new UnauthorizedError('토큰에 저장된 userId가 유효하지 않습니다.');
    }

    req.user = { id: userIdInt };
    next();

    } catch (error) {
    if (error.name === 'TokenExpiredError') {
      next(new UnauthorizedError("TOKEN_EXPIRED", "토큰이 만료되었습니다."));
      return;
    }
  
    if (error.name === 'JsonWebTokenError') { 
      next(new UnauthorizedError("TOKEN_INVALID", "토큰이 유효하지 않습니다."));
      return;
    }
    next(error);
  }
}