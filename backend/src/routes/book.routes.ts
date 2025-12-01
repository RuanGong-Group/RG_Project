/**
 * 词书管理路由
 * 定义词书相关的 API 端点
 */

import express from 'express';
import { getAllBooks, getBookWords, reshuffleBook } from '../controllers/book.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = express.Router();

/**
 * GET /api/books
 * 获取所有词书列表
 * 需要认证
 */
router.get('/', authenticateToken, getAllBooks);

/**
 * GET /api/books/:bookId/words
 * 获取词书的单词列表（带稳定乱序）
 * 需要认证
 * Query参数: limit, offset, includeProgress
 */
router.get('/:bookId/words', authenticateToken, getBookWords);

/**
 * POST /api/books/:bookId/reshuffle
 * 重新乱序词书
 * 需要认证
 */
router.post('/:bookId/reshuffle', authenticateToken, reshuffleBook);

export default router;
