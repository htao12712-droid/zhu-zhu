import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { AppError } from '../middleware/errorHandler';
import { generateToken } from '../middleware/auth';
import userService from '../services/userService';

interface RegisterBody {
  phone: string;
  email?: string;
  password: string;
  nickname?: string;
}

interface LoginBody {
  phone: string;
  password: string;
}

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { phone, email, password, nickname } = req.body as RegisterBody;

    if (!phone || !password) {
      throw new AppError(400, '手机号和密码不能为空');
    }

    if (!/^1[3-9]\d{9}$/.test(phone)) {
      throw new AppError(400, '手机号格式不正确');
    }

    if (password.length < 6) {
      throw new AppError(400, '密码长度不能少于6位');
    }

    const existingUser = await userService.findByPhone(phone);

    if (existingUser) {
      throw new AppError(400, '手机号已被注册');
    }

    if (email) {
      const existingEmail = await userService.findByEmail(email);
      if (existingEmail) {
        throw new AppError(400, '邮箱已被注册');
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await userService.create({
      phone,
      email,
      password_hash: hashedPassword,
      nickname: nickname || `用户${phone.slice(-4)}`
    });

    const token = generateToken(user.id);

    res.status(201).json({
      message: '注册成功',
      token,
      user: {
        id: user.id,
        phone: user.phone,
        email: user.email,
        nickname: user.nickname,
        member_level: user.member_level
      }
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { phone, password } = req.body as LoginBody;

    if (!phone || !password) {
      throw new AppError(400, '手机号和密码不能为空');
    }

    const user = await userService.findByPhone(phone);

    if (!user) {
      throw new AppError(401, '手机号或密码错误');
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      throw new AppError(401, '手机号或密码错误');
    }

    const token = generateToken(user.id);

    res.json({
      message: '登录成功',
      token,
      user: {
        id: user.id,
        phone: user.phone,
        email: user.email,
        nickname: user.nickname,
        avatar_url: user.avatar_url,
        member_level: user.member_level,
        member_expires_at: user.member_expires_at
      }
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ message: '登出成功' });
  } catch (error) {
    next(error);
  }
};

export const getProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.userId) {
      throw new AppError(401, '未登录');
    }

    const user = await userService.findById(req.userId);

    if (!user) {
      throw new AppError(404, '用户不存在');
    }

    res.json({
      user: {
        id: user.id,
        phone: user.phone,
        email: user.email,
        nickname: user.nickname,
        avatar_url: user.avatar_url,
        member_level: user.member_level,
        member_expires_at: user.member_expires_at,
        created_at: user.created_at
      }
    });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.userId) {
      throw new AppError(401, '未登录');
    }

    const { nickname, avatar_url } = req.body;

    const user = await userService.update(req.userId, {
      nickname,
      avatar_url
    });

    res.json({
      message: '更新成功',
      user: {
        id: user!.id,
        phone: user!.phone,
        email: user!.email,
        nickname: user!.nickname,
        avatar_url: user!.avatar_url,
        member_level: user!.member_level
      }
    });
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.userId) {
      throw new AppError(401, '未登录');
    }

    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      throw new AppError(400, '旧密码和新密码不能为空');
    }

    if (newPassword.length < 6) {
      throw new AppError(400, '新密码长度不能少于6位');
    }

    const user = await userService.findById(req.userId);

    if (!user) {
      throw new AppError(404, '用户不存在');
    }

    const isValidPassword = await bcrypt.compare(oldPassword, user.password_hash);

    if (!isValidPassword) {
      throw new AppError(401, '旧密码错误');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await userService.update(req.userId, {
      password_hash: hashedPassword
    });

    res.json({ message: '密码修改成功' });
  } catch (error) {
    next(error);
  }
};
