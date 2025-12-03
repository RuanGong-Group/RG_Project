import prisma from '../utils/prisma';
import { normalizePronunciation } from '../utils/text';

export class NotebookService {
  /**
   * 添加单词到生词本
   */
  async addWordToNotebook(userId: number, wordId: number) {
    // 检查单词是否存在
    const word = await prisma.word.findUnique({
      where: { id: wordId }
    });

    if (!word) {
      throw new Error('单词不存在');
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
      throw new Error('单词已在生词本中');
    }

    // 添加到生词本
    const notebookEntry = await prisma.userWordNotebook.create({
      data: {
        userId,
        wordId
      }
    });

    return notebookEntry;
  }

  /**
   * 从生词本删除单词
   */
  async removeWordFromNotebook(userId: number, wordId: number) {
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
      throw new Error('单词不在生词本中');
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
  }

  /**
   * 获取生词本列表
   */
  async getNotebookWords(userId: number) {
    // 获取生词本中的所有单词，包含完整信息
    const notebookEntries = await prisma.userWordNotebook.findMany({
      where: { userId },
      include: {
        word: {
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
      pronunciations: normalizePronunciation(entry.word.pronunciation),
      addedAt: entry.addedAt,
      meanings: entry.word.meanings.map(meaning => ({
        meaningId: meaning.id,
        partOfSpeech: meaning.partOfSpeech,
        definition: meaning.definition,
        examples: meaning.examples.map(rel => ({
          sentence: rel.example.sentence,
          highlightWord: rel.highlightWord
        }))
      }))
    }));

    return {
      total: words.length,
      words
    };
  }
}

export const notebookService = new NotebookService();
