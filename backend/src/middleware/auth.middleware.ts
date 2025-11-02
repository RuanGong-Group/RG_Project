import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

/**
 * 扩展 Express Request 类型，添加 user 属性
 */
export interface AuthRequest extends Request {
  user?: {
    userId: number;
    username: string;
  };
}

/**
 * JWT 验证中间件
 * 验证请求头中的 Bearer token
 */
export const authenticateToken = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
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
    
    jwt.verify(token, jwtSecret, (err, decoded) => {
      if (err) {
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

      // 将用户信息附加到请求对象
      (req as AuthRequest).user = decoded as {
        userId: number;
        username: string;
      };
      res.locals.user = (req as AuthRequest).user;
      
      next();
    });
  } catch (error) {
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
