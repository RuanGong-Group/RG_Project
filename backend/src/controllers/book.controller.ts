/**
 * 词书管理控制器
 * 处理词书相关的业务逻辑
 */

import { Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

/**
 * 获取所有词书列表
 * GET /api/books
 */
export const getAllBooks = async (_req: AuthRequest, res: Response) => {
  try {
    // 查询所有词书，并统计每个词书的单词数量
    const books = await prisma.bookTag.findMany({
      include: {
        _count: {
          select: {
            words: true // 统计关联的单词数量
          }
        }
      },
      orderBy: {
        id: 'asc'
      }
    });

    // 格式化返回数据
    const formattedBooks = books.map(book => ({
      id: book.id,
      tagName: book.tagName,
      isUserDefined: book.isUserDefined,
      wordCount: book._count.words,
      createdAt: book.createdAt
    }));

    res.json({
      success: true,
      data: formattedBooks,
      message: '成功获取词书列表'
    });
  } catch (error) {
    console.error('获取词书列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取词书列表失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
};

/**
 * 获取当前学习词书
 * GET /api/user/current-book
 */
export const getCurrentBook = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '用户未认证'
      });
    }

    // 查询用户信息，包括当前选择的词书
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        currentBookTag: {
          include: {
            _count: {
              select: {
                words: true
              }
            }
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 如果用户还没有选择词书
    if (!user.currentBookTag) {
      return res.json({
        success: true,
        data: null,
        message: '用户尚未选择学习词书'
      });
    }

    // 返回当前词书信息
    const currentBook = {
      id: user.currentBookTag.id,
      tagName: user.currentBookTag.tagName,
      isUserDefined: user.currentBookTag.isUserDefined,
      wordCount: user.currentBookTag._count.words,
      createdAt: user.currentBookTag.createdAt
    };

    return res.json({
      success: true,
      data: currentBook,
      message: '成功获取当前学习词书'
    });
  } catch (error) {
    console.error('获取当前词书失败:', error);
    return res.status(500).json({
      success: false,
      message: '获取当前词书失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
};

/**
 * 切换当前学习词书
 * PUT /api/user/current-book
 * Body: { bookId: number }
 */
export const updateCurrentBook = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { bookId } = req.body as { bookId: number };

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '用户未认证'
      });
    }

    // 验证请求参数
    if (!bookId || typeof bookId !== 'number') {
      return res.status(400).json({
        success: false,
        message: '请提供有效的词书ID'
      });
    }

    // 检查词书是否存在
    const book = await prisma.bookTag.findUnique({
      where: { id: bookId },
      include: {
        _count: {
          select: {
            words: true
          }
        }
      }
    });

    if (!book) {
      return res.status(404).json({
        success: false,
        message: '指定的词书不存在'
      });
    }

    // 更新用户的当前词书
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        currentBookTagId: bookId
      },
      include: {
        currentBookTag: {
          include: {
            _count: {
              select: {
                words: true
              }
            }
          }
        }
      }
    });

    // 返回更新后的词书信息
    const currentBook = {
      id: updatedUser.currentBookTag!.id,
      tagName: updatedUser.currentBookTag!.tagName,
      isUserDefined: updatedUser.currentBookTag!.isUserDefined,
      wordCount: updatedUser.currentBookTag!._count.words,
      createdAt: updatedUser.currentBookTag!.createdAt
    };

    return res.json({
      success: true,
      data: currentBook,
      message: `成功切换到词书：${currentBook.tagName}`
    });
  } catch (error) {
    console.error('切换词书失败:', error);
    return res.status(500).json({
      success: false,
      message: '切换词书失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
};
