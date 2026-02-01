import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './errorHandler';
import userService from '../services/userService';

declare global {
  namespace Express {
    interface Request {
      userId?: number;
      user?: any;
    }
  }
}

const AUTH_DISABLED = (process.env.DISABLE_AUTH || 'true') === 'true';

function attachDemoUser(req: Request) {
  req.userId = 1;
  req.user = {
    id: 1,
    phone: '00000000000',
    email: 'demo@local',
    nickname: '演示用户',
    member_level: 2,
    member_expires_at: null
  };
}

export interface JWTPayload {
  userId: number;
  iat: number;
  exp: number;
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (AUTH_DISABLED) {
      attachDemoUser(req);
      return next();
    }

    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new AppError(401, '未提供认证令牌');
    }

    const token = authHeader.replace('Bearer ', '');

    if (!token) {
      throw new AppError(401, '未提供认证令牌');
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'secret'
    ) as JWTPayload;

    if (!decoded.userId) {
      throw new AppError(401, '无效的认证令牌');
    }

    const user = await userService.findById(decoded.userId);

    if (!user) {
      throw new AppError(401, '用户不存在');
    }

    req.userId = user.id;
    req.user = user;

    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
    } else if (error instanceof jwt.JsonWebTokenError) {
      next(new AppError(401, '无效的认证令牌'));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new AppError(401, '认证令牌已过期'));
    } else {
      next(new AppError(401, '认证失败'));
    }
  }
};

export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (AUTH_DISABLED) {
      attachDemoUser(req);
      return next();
    }

    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return next();
    }

    const token = authHeader.replace('Bearer ', '');

    if (!token) {
      return next();
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'secret'
    ) as JWTPayload;

    if (decoded.userId) {
      const user = await userService.findById(decoded.userId);
      if (user) {
        req.userId = user.id;
        req.user = user;
      }
    }

    next();
  } catch (error) {
    next();
  }
};

export const requireMembership = (minLevel: number = 1) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (AUTH_DISABLED) {
      attachDemoUser(req);
      return next();
    }

    if (!req.user) {
      return next(new AppError(401, '未登录'));
    }

    if (req.user.member_level < minLevel) {
      return next(new AppError(403, '权限不足,需要升级会员'));
    }

    next();
  };
};

export const generateToken = (userId: number): string => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET || 'secret',
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    } as jwt.SignOptions
  );
};

export const verifyToken = (token: string): JWTPayload => {
  return jwt.verify(token, process.env.JWT_SECRET || 'secret') as JWTPayload;
};

export const decodeToken = (token: string): JWTPayload | null => {
  try {
    return jwt.decode(token) as JWTPayload;
  } catch {
    return null;
  }
};
