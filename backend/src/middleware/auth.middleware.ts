import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma';

/**
 * 扩展 Express Request 类型，添加 user 属性
 */
export interface AuthRequest extends Request {
  user?: {
    userId: number;
    username: string;
    tokenVersion?: number;
  };
}

/**
 * JWT 验证中间件
 * 验证请求头中的 Bearer token，并检查 token 版本是否匹配（防止并发登录）
 */
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // 从请求头获取 token
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({
        success: false,
        message: '未提供认证令牌'
      });
      return;
    }

    // 验证 token
    const jwtSecret = process.env.JWT_SECRET || 'default-secret-key';
    
    // 使用 Promisify 风格或直接 try-catch verify
    let decoded: any;
    try {
      decoded = jwt.verify(token, jwtSecret);
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        res.status(401).json({
          success: false,
          message: '认证令牌已过期，请重新登录'
        });
        return;
      }
      res.status(403).json({
        success: false,
        message: '无效的认证令牌'
      });
      return;
    }

    // 检查数据库中的 token 版本
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, username: true, tokenVersion: true }
    });

    if (!user) {
      res.status(401).json({
        success: false,
        message: '用户不存在'
      });
      return;
    }

    // 如果 token 中包含 version，则必须匹配
    if (decoded.tokenVersion !== undefined && decoded.tokenVersion !== user.tokenVersion) {
      res.status(401).json({
        success: false,
        message: '账号已在其他设备登录，请重新登录'
      });
      return;
    }

    // 如果 token 中没有 version 但数据库中 version > 0，说明是旧 token，强制失效
    if (decoded.tokenVersion === undefined && user.tokenVersion > 0) {
       res.status(401).json({
        success: false,
        message: '认证令牌已失效，请重新登录'
      });
      return;
    }

    // 将用户信息附加到请求对象
    (req as AuthRequest).user = {
      userId: user.id,
      username: user.username,
      tokenVersion: user.tokenVersion
    };
    res.locals.user = (req as AuthRequest).user;
    
    next();
  } catch (error) {
    console.error('Auth Middleware Error:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
};

/**
 * 可选的 JWT 验证中间件
 * 如果有 token 则验证，没有也不报错，继续执行
 */
export const optionalAuthenticateToken = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      next();
      return;
    }

    const jwtSecret = process.env.JWT_SECRET || 'default-secret-key';
    
    jwt.verify(token, jwtSecret, (err, decoded) => {
      if (!err && decoded) {
        (req as AuthRequest).user = decoded as {
          userId: number;
          username: string;
        };
        res.locals.user = (req as AuthRequest).user;
      }
      next();
    });
  } catch (error) {
    // 可选认证模式下，出错也继续执行
    next();
  }
};
