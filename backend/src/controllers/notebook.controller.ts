import { Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { safeJsonParse } from '../utils/datetime';

/**
 * 添加单词到生词本
 * POST /api/notebook/words
 */
export async function addWordToNotebook(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: '用户未认证'
      });
      return;
    }
    const { wordId } = req.body;

    // 参数验证
    if (!wordId) {
      return res.status(400).json({
        success: false,
        message: '缺少必要参数 wordId'
      });
    }

    // 检查单词是否存在
    const word = await prisma.word.findUnique({
      where: { id: wordId }
    });

    if (!word) {
      return res.status(404).json({
        success: false,
        message: '单词不存在'
      });
    }

    // 检查是否已经在生词本中
    const existing = await prisma.userWordNotebook.findUnique({
      where: {
        userId_wordId: {
          userId,
          wordId
        }
      }
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: '单词已在生词本中'
      });
    }

    // 添加到生词本
    const notebookEntry = await prisma.userWordNotebook.create({
      data: {
        userId,
        wordId
      }
    });

    return res.json({
      success: true,
      message: '成功添加到生词本',
      data: notebookEntry
    });
  } catch (error) {
    console.error('添加生词本失败:', error);
    return res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
}

/**
 * 从生词本删除单词
 * DELETE /api/notebook/words/:wordId
 */
export async function removeWordFromNotebook(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: '用户未认证'
      });
      return;
    }

    const wordId = parseInt(req.params.wordId as string);

    // 参数验证
    if (isNaN(wordId)) {
      return res.status(400).json({
        success: false,
        message: '无效的 wordId'
      });
    }

    // 检查是否在生词本中
    const existing = await prisma.userWordNotebook.findUnique({
      where: {
        userId_wordId: {
          userId,
          wordId
        }
      }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: '单词不在生词本中'
      });
    }

    // 删除
    await prisma.userWordNotebook.delete({
      where: {
        userId_wordId: {
          userId,
          wordId
        }
      }
    });

    return res.json({
      success: true,
      message: '成功从生词本删除'
    });
  } catch (error) {
    console.error('删除生词本失败:', error);
    return res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
}

/**
 * 获取生词本列表
 * GET /api/notebook/words
 */
export async function getNotebookWords(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: '用户未认证'
      });
      return;
    }

    // 获取生词本中的所有单词，包含完整信息
    const notebookEntries = await prisma.userWordNotebook.findMany({
      where: { userId },
      include: {
        word: {
          include: {
            partsOfSpeech: {
              include: {
                meanings: {
                  include: {
                    examples: {
                      include: {
                        example: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        addedAt: 'desc'
      }
    });

    // 格式化响应数据
    const words = notebookEntries.map(entry => ({
      notebookId: entry.id,
      wordId: entry.wordId,
      word: entry.word.word,
      pronunciation: safeJsonParse(entry.word.pronunciation, { uk: '', us: '' }),
      addedAt: entry.addedAt,
      meanings: entry.word.partsOfSpeech.flatMap(pos => 
        pos.meanings.map(meaning => ({
          meaningId: meaning.id,
          partOfSpeech: pos.partOfSpeech,
          definition: meaning.definition,
          examples: meaning.examples.map(rel => ({
            sentence: rel.example.sentence,
            highlightWord: rel.highlightWord
          }))
        }))
      )
    }));

    return res.json({
      success: true,
      data: {
        total: words.length,
        words
      }
    });
  } catch (error) {
    console.error('获取生词本失败:', error);
    return res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
}
