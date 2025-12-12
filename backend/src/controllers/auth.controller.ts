import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import prisma from '../utils/prisma';
import { getBeijingTime } from '../utils/datetime';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

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

    // 检查用户是否有密码（OAuth 用户没有密码）
    if (!user.passwordHash) {
      res.status(401).json({
        success: false,
        message: '此账号使用 OAuth 登录，请使用 GitHub 登录'
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

/**
 * GitHub OAuth Callback
 * GET /api/auth/github/callback
 */
export const githubCallback = async (req: Request, res: Response): Promise<void> => {
  const { code } = req.query;

  console.log('🔵 GitHub OAuth Callback received:', { code: code ? 'exists' : 'missing' });

  if (!code) {
    console.error('❌ Missing code parameter');
    res.status(400).json({ success: false, message: 'Missing code' });
    return;
  }

  if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
    console.error('❌ GitHub OAuth credentials not configured');
    res.status(500).json({ success: false, message: 'Server configuration error' });
    return;
  }

  try {
    console.log('🔄 Exchanging code for access token...');
    // 1. Exchange code for token
    const tokenRes = await axios.post('https://github.com/login/oauth/access_token', {
      client_id: GITHUB_CLIENT_ID,
      client_secret: GITHUB_CLIENT_SECRET,
      code
    }, {
      headers: { Accept: 'application/json' }
    });

    console.log('📦 Token response:', tokenRes.data);

    const { access_token, error, error_description } = tokenRes.data;
    
    if (error) {
      console.error('❌ GitHub OAuth error:', error, error_description);
      res.status(400).json({ success: false, message: error_description || error });
      return;
    }
    
    if (!access_token) {
      console.error('❌ No access token in response');
      res.status(400).json({ success: false, message: 'Failed to get access token' });
      return;
    }

    console.log('✅ Access token obtained, fetching user info...');
    // 2. Get user info
    const userRes = await axios.get('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    console.log('👤 GitHub user:', { id: userRes.data.id, login: userRes.data.login });
    const { id: githubId, login: username } = userRes.data;
    const githubIdStr = String(githubId);

    // 3. Find or create user
    console.log('🔍 Looking for user with githubId:', githubIdStr);
    let user = await prisma.user.findUnique({
      where: { githubId: githubIdStr }
    });

    if (!user) {
      console.log('👤 User not found, creating new user...');
      // Check if username exists, if so, append random string
      let newUsername = username;
      const existingUsername = await prisma.user.findUnique({ where: { username: newUsername } });
      if (existingUsername) {
        newUsername = `${username}_${Math.floor(Math.random() * 10000)}`;
        console.log('⚠️ Username collision, using:', newUsername);
      }

      user = await prisma.user.create({
        data: {
          username: newUsername,
          githubId: githubIdStr,
          dailyLearningGoal: 10 // Default value
        }
      });
      console.log('✅ New user created:', { id: user.id, username: user.username });
    } else {
      console.log('✅ Existing user found:', { id: user.id, username: user.username });
    }

    // 4. Generate JWT
    console.log('🔐 Generating JWT token...');
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // 5. Return JSON response (not redirect)
    console.log('✅ GitHub OAuth successful, returning token');
    res.status(200).json({
      success: true,
      message: 'GitHub login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        createdAt: user.createdAt
      }
    });

  } catch (error) {
    console.error('❌ GitHub OAuth Error:', error);
    if (axios.isAxiosError(error)) {
      console.error('Axios error details:', {
        status: error.response?.status,
        data: error.response?.data
      });
    }
    res.status(500).json({ 
      success: false, 
      message: error instanceof Error ? error.message : 'OAuth failed' 
    });
  }
};
