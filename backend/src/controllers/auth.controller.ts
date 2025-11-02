import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma';
import { getBeijingTime } from '../utils/datetime';

/**
 * 用户注册控制器
 * POST /api/auth/register
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;

    // 验证输入
    if (!username || !password) {
      res.status(400).json({
        success: false,
        message: '用户名和密码不能为空'
      });
      return;
    }

    // 验证用户名长度
    if (username.length < 3 || username.length > 50) {
      res.status(400).json({
        success: false,
        message: '用户名长度必须在 3-50 个字符之间'
      });
      return;
    }

    // 验证密码强度
    if (password.length < 6) {
      res.status(400).json({
        success: false,
        message: '密码长度至少为 6 个字符'
      });
      return;
    }

    // 检查用户名是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { username }
    });

    if (existingUser) {
      res.status(409).json({
        success: false,
        message: '用户名已被使用'
      });
      return;
    }

    // 加密密码
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // 创建新用户
    const newUser = await prisma.user.create({
      data: {
        username,
        passwordHash
      },
      select: {
        id: true,
        username: true,
        createdAt: true
      }
    });

    res.status(201).json({
      success: true,
      message: '注册成功',
      data: {
        user: newUser
      }
    });
  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

/**
 * 用户登录控制器
 * POST /api/auth/login
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;

    // 验证输入
    if (!username || !password) {
      res.status(400).json({
        success: false,
        message: '用户名和密码不能为空'
      });
      return;
    }

    // 查找用户
    const user = await prisma.user.findUnique({
      where: { username }
    });

    if (!user) {
      res.status(401).json({
        success: false,
        message: '用户名或密码错误'
      });
      return;
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        message: '用户名或密码错误'
      });
      return;
    }

    // 生成 JWT
    const jwtSecret = process.env.JWT_SECRET || 'default-secret-key';
    const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';

    const token = jwt.sign(
      { 
        userId: user.id, 
        username: user.username 
      },
      jwtSecret,
      { expiresIn: jwtExpiresIn } as jwt.SignOptions
    );

    // 更新最后登录时间
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: getBeijingTime() }
    });

    res.status(200).json({
      success: true,
      message: '登录成功',
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          createdAt: user.createdAt
        }
      }
    });
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};
