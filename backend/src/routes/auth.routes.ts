import { Router } from 'express';
import { register, login, githubCallback } from '../controllers/auth.controller';

const router = Router();

/**
 * @route   GET /api/auth/github/callback
 * @desc    GitHub OAuth Callback
 * @access  Public
 */
router.get('/github/callback', githubCallback);

/**
 * @route   POST /api/auth/register
 * @desc    用户注册
 * @access  Public
 */
router.post('/register', register);

/**
 * @route   POST /api/auth/login
 * @desc    用户登录
 * @access  Public
 */
router.post('/login', login);

export default router;
