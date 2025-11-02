/**
 * 词书管理路由
 * 定义词书相关的 API 端点
 */

import express from 'express';
import { getAllBooks } from '../controllers/book.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = express.Router();

/**
 * GET /api/books
 * 获取所有词书列表
 * 需要认证
 */
router.get('/', authenticateToken, getAllBooks);

export default router;
