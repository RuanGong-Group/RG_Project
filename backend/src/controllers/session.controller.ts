import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { randomUUID } from 'crypto';
import { recordLearningResult } from '../services/learning.service';
import prisma from '../utils/prisma';
import * as SessionService from '../services/session.service';
import { updateTodayCheckIn } from './checkin.controller';
import { getBeijingToday } from '../utils/datetime';
import { normalizePronunciation } from '../utils/text';

// 重构后的 Controller 层：仅负责处理 HTTP 请求/响应，业务逻辑移至 SessionService

// Helper to safely extract sentence string
const getSafeSentence = (exampleObj: any): string => {
  if (!exampleObj) return '';
  if (typeof exampleObj === 'string') return exampleObj;
  
  const s = exampleObj.sentence;
  if (typeof s === 'string') return s;
  if (!s) return '';
  
  console.warn('⚠️ Warning: Non-string sentence detected:', s);
  return String(s);
};

// Helper to extract Chinese from definition (consistent with session.service.ts)
const extractChinese = (text: string): string => {
  if (!text) return '';
  // 尝试按分号分割
  const parts = text.split(/;|；/);
  // 优先返回包含中文的部分
  for (const part of parts) {
    if (/[\u4e00-\u9fa5]/.test(part)) {
      return part.trim();
    }
  }
  // 如果没有中文，返回原文本
  return text;
};

export const startSession = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId || 1;
    const { bookTagId, mode = 'new-only' } = req.body || {};
    
    // 获取用户目标（优先级：用户配置 > 默认值）
    const user = await prisma.user.findUnique({ 
      where: { id: userId }, 
      select: { dailyLearningGoal: true } 
    });
    const dailyGoal = user?.dailyLearningGoal || 10;
    
    // 检查每日目标是否完成 (仅在新学模式下)
    if (mode === 'new-only') {
      const today = getBeijingToday();
      const checkIn = await prisma.dailyCheckIn.findUnique({
        where: { userId_checkInDate: { userId, checkInDate: today } }
      });
      if (checkIn) {
        const totalCompleted = checkIn.wordsLearned + checkIn.wordsReviewed;
        if (totalCompleted >= dailyGoal) {
          return res.json({ 
            success: true, 
            message: '今日学习目标已完成！',
            data: { 
              sessionId: randomUUID(),
              type: 'session-complete', 
              data: { 
                message: '今日学习目标已完成！',
                isGoalReached: true 
              },
              step: 0
            } 
          });
        }
      }
    }

    // 获取下一个要学习的单词（包含所有词义）
    const nextWord = await SessionService.pickNextWordForSession({ learned: new Set(), skipped: new Set(), userId, bookTagId, mode });
    const sessionId = randomUUID();
    
    const session = {
      id: sessionId,
      userId,
      bookTagId: bookTagId || null,
      dailyGoal: dailyGoal, // Store the actual goal from user config
      mode: mode as 'review-only' | 'new-only',
      state: 'running',
      step: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      learned: new Set<string>(),
      skipped: new Set<string>(),
      currentWord: nextWord ? {
        wordId: nextWord.wordId,
        word: nextWord.word,
        lemma: nextWord.lemma,
        pronunciations: nextWord.pronunciations,
        meanings: nextWord.meanings.map(m => ({ 
          meaningId: m.meaningId, 
          partOfSpeech: m.partOfSpeech,
          definition: m.definition,
          examples: m.examples,
          learned: false 
        })),
        currentMeaningIndex: 0
      } : null,
      boosters: [] as SessionService.BoosterTicket[],
      boosterCounts: {} as Record<number, number>,
      lastPath: null
    };
    SessionService.sessionStore.set(sessionId, session);

    if (!session.currentWord) {
      return res.json({ success: true, message: '无可学习项目', data: { sessionId: session.id, type: 'session-complete', data: null, step: session.step } });
    }

    const currentMeaning = session.currentWord.meanings[0];
    const exampleObj = currentMeaning.examples[0] || '';
    const sentence = getSafeSentence(exampleObj);
    const translation = typeof exampleObj === 'string' ? '' : (exampleObj.translation || '');
    
    // 复习模式: 直接出题,不显示三路径选择
    if (mode === 'review-only') {
      // 查询masteryFocus判断题型
      const masteryFocus = await prisma.wordTagRelation.findFirst({
        where: {
          wordId: session.currentWord.wordId,
          bookTagId: bookTagId || undefined
        },
        select: { masteryFocus: true }
      });

      const questionType = masteryFocus?.masteryFocus === 'production' ? 'production' : 'recognition';
      
      if (questionType === 'production') {
        // 拼写题: 给出释义和例句,要求输入单词
        return res.json({
          success: true,
          message: 'Session 创建成功',
          data: {
            sessionId: session.id,
            mode: session.mode,
            type: 'show-spelling-question',
            data: {
              word: {
                id: session.currentWord.wordId,
                word: session.currentWord.word, // 前端不显示,仅用于验证
                lemma: session.currentWord.lemma,
                pronunciations: normalizePronunciation(session.currentWord.pronunciations)
              },
              meaningId: currentMeaning.meaningId,
              definition: currentMeaning.definition,
              partOfSpeech: currentMeaning.partOfSpeech,
              sentence,
              translation,
              highlightWord: session.currentWord.word,
              prompt: '请根据释义和例句拼写单词',
              wordProgress: {
                currentMeaning: 1,
                totalMeanings: session.currentWord.meanings.length
              }
            },
            step: session.step
          }
        });
      } else {
        // 识别题: 四选一选择题
        const question = await SessionService.makeQuestionForMeaning(currentMeaning.meaningId);
        return res.json({
          success: true,
          message: 'Session 创建成功',
          data: {
            sessionId: session.id,
            mode: session.mode,
            type: 'show-question',
            data: {
              word: {
                id: session.currentWord.wordId,
                word: session.currentWord.word,
                lemma: session.currentWord.lemma,
                pronunciations: normalizePronunciation(session.currentWord.pronunciations)
              },
              meaningId: currentMeaning.meaningId,
              sentence,
              translation,
              highlightWord: session.currentWord.word,
              prompt: question.prompt,
              options: question.options,
              wordProgress: {
                currentMeaning: 1,
                totalMeanings: session.currentWord.meanings.length
              }
            },
            step: session.step
          }
        });
      }
    }
    
    // 学习模式: 显示例句和三路径选择
    return res.json({ 
      success: true, 
      message: 'Session 创建成功', 
      data: { 
        sessionId: session.id,
        mode: session.mode,
        type: 'show-sentence', 
        data: { 
          word: { 
            id: session.currentWord.wordId, 
            word: session.currentWord.word, 
            lemma: session.currentWord.lemma,
            pronunciations: normalizePronunciation(session.currentWord.pronunciations) 
          }, 
          meaningId: currentMeaning.meaningId, 
          sentence,
          translation,
          highlightWord: session.currentWord.word,
          wordProgress: {
            currentMeaning: 1,
            totalMeanings: session.currentWord.meanings.length
          }
        }, 
        step: session.step 
      } 
    });
  } catch (error) {
    console.error('startSession error', error);
    res.status(500).json({ success: false, message: '服务器错误', error: (error as Error).message });
    return;
  }
};

export const actionSession = async (req: AuthRequest, res: Response) => {
  try {
    const { sessionId, action, payload } = req.body || {};
    if (!sessionId || !action) return res.status(400).json({ success: false, message: '缺失参数' });
    const session = SessionService.sessionStore.get(sessionId);
    if (!session) return res.status(404).json({ success: false, message: 'Session 未找到' });

    // 安全检查：确保 Session 属于当前用户
    const userId = req.user?.userId;
    if (session.userId !== userId) {
      console.warn(`⚠️ Security Alert: User ${userId} tried to access session ${sessionId} belonging to User ${session.userId}`);
      return res.status(403).json({ success: false, message: '无权访问此 Session' });
    }

    if (action === 'choosePath') {
      const pathChoice = payload && payload.path;
      session.lastPath = pathChoice;
      
      if (!session.currentWord) {
        return res.status(500).json({ success: false, message: '内部错误: 未找到当前单词' });
      }
      
      const currentMeaningIndex = session.currentWord.currentMeaningIndex;
      const currentMeaning = session.currentWord.meanings[currentMeaningIndex];
      
      // Query full word and meaning data from database
      const m = await prisma.meaning.findUnique({
        where: { id: currentMeaning.meaningId },
        include: {
          word: {
            select: { id: true, word: true, pronunciation: true }
          },
          examples: {
            select: { 
              example: { select: { sentence: true, translation: true } },
              isPrimary: true
            }
          }
        }
      });
      if (!m) return res.status(500).json({ success: false, message: '内部错误: 未找到当前词义' });

      const canCreateBooster = async (meaningId: number) => (await SessionService.getBoosterCount(session.userId, meaningId, session) < 2);

      // 路径 C（不认识）：直接显示教学卡片，创建 Booster，标记已学
      if (pathChoice === 'C') {
        let createdBooster = null as null | { ticketId: string; afterN: number };
        if (await canCreateBooster(m.id)) {
          const ticket: SessionService.BoosterTicket = { id: randomUUID(), meaningId: m.id, afterN: 10, createdAt: new Date().toISOString() };
          session.boosters.push(ticket);
          createdBooster = { ticketId: ticket.id, afterN: ticket.afterN };
        }
        const exampleSentences = m.examples.map((rel, i) => ({ 
          id: i + 1, 
          sentence: String(rel.example.sentence || ''),
          translation: rel.example.translation 
        }));
        
        // 路径C：标记当前词义已学完
        session.currentWord.meanings[currentMeaningIndex].learned = true;
        const meaningKey = `meaning:${m.id}`;
        session.learned.add(meaningKey);
        
        // Persist learning result
        try {
          await recordLearningResult(session.userId, m.id, false); // 不认识 = 答错
        } catch (err) {
          console.error('Failed to persist learning result:', err);
        }
        
        return res.json({ 
          success: true, 
          data: { 
            sessionId: session.id, 
            type: 'show-card', 
            data: { 
              meaningId: m.id, 
              showResult: false, // 路径C不显示对错
              word: {
                id: session.currentWord.wordId,
                word: session.currentWord.word,
                lemma: session.currentWord.lemma,
                pronunciations: normalizePronunciation(session.currentWord.pronunciations)
              },
              sentence: exampleSentences[0]?.sentence || '', // 添加例句用于固定上下文
              translation: exampleSentences[0]?.translation || '',
              highlightWord: session.currentWord.word,
              card: { 
                definition: m.definition, 
                partOfSpeech: m.partOfSpeech, 
                pronunciations: normalizePronunciation(m.word.pronunciation), 
                examples: exampleSentences 
              },
              wordProgress: {
                currentMeaning: currentMeaningIndex + 1,
                totalMeanings: session.currentWord.meanings.length
              }
            }, 
            createdBooster, 
            step: session.step 
          } 
        });
      } 
      
      // 路径 A/B：返回选择题（附带句子信息用于前端回顾）
      const q = await SessionService.makeQuestionForMeaning(currentMeaning.meaningId);

      // Handle legacy string examples or new object examples
      const exObj = currentMeaning.examples[0];
      const sentence = getSafeSentence(exObj);
      const translation = typeof exObj === 'string' ? '' : (exObj?.translation || '');

      return res.json({ 
        success: true, 
        data: { 
          sessionId: session.id, 
          type: 'show-question', 
          data: { 
            questionId: q.questionId, 
            meaningId: currentMeaning.meaningId, 
            prompt: q.prompt, 
            options: q.options, 
            timeLimitSec: q.timeLimitSec,
            // 新增：附带句子和单词信息，用于前端显示例句回顾
            sentence,
            translation,
            word: {
              word: session.currentWord.word,
              lemma: session.currentWord.lemma,
              pronunciations: normalizePronunciation(session.currentWord.pronunciations)
            },
            wordProgress: {
              currentMeaning: currentMeaningIndex + 1,
              totalMeanings: session.currentWord.meanings.length
            }
          }, 
          step: session.step 
        } 
      });
    }

    // Temporary debug action: reset learned/skipped for this session (local dev only)
    if (action === 'resetDemo') {
      // only allow in non-production env
      if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({ success: false, message: 'not allowed in production' });
      }
      session.learned = new Set<string>();
      session.skipped = new Set<string>();
      session.boosters = [];
      session.boosterCounts = {};
      session.current = await SessionService.pickNextMeaningForSession(session);
      session.step = 0;
      session.updatedAt = new Date().toISOString();
      return res.json({ success: true, message: 'session reset (demo)', data: { sessionId: session.id, current: session.current } });
    }

    if (action === 'submitAnswer') {
      const { meaningId, selectedOptionId, selectedOptionText } = payload || {};
      
      if (!session.currentWord) {
        return res.status(500).json({ success: false, message: '内部错误: 未找到当前单词' });
      }
      
      const currentMeaningIndex = session.currentWord.currentMeaningIndex;
      const currentMeaning = session.currentWord.meanings[currentMeaningIndex];
      const isBooster = session.currentWord.isBooster === true;
      
      // Query word and meaning from database
      const m = await prisma.meaning.findUnique({
        where: { id: meaningId },
        include: {
          word: {
            select: { id: true, word: true, pronunciation: true }
          },
          examples: {
            select: { 
              example: { select: { sentence: true, translation: true } },
              isPrimary: true
            }
          }
        }
      });
      if (!m) return res.status(500).json({ success: false, message: '内部错误: 未找到当前词义' });
      
      // 核心修复：不再依赖随机生成的 ID，而是验证选项文本内容
      // 如果前端传了 selectedOptionText，直接比对定义
      let isCorrect = false;
      if (selectedOptionText) {
        // 修复：比对提取出的中文释义，而不是完整释义
        isCorrect = selectedOptionText === extractChinese(m.definition);
      } else {
        // 兼容旧逻辑（不推荐，仍有随机性 Bug）
        const q = await SessionService.makeQuestionForMeaning(meaningId);
        const selected = q.options.find((o: any) => o.id === selectedOptionId);
        isCorrect = !!(selected && selected.text === extractChinese(m.definition));
      }

      const meaningKey = `meaning:${m.id}`;
      if (isCorrect) session.learned.add(meaningKey);
      
      // Persist learning result to database
      try {
        // 传递 isBooster 参数，防止短期强化被错误统计为复习
        await recordLearningResult(session.userId, meaningId, !!isCorrect, undefined, isBooster);
        // Booster 的统计已在 recordLearningResult 内部处理，此处不再重复统计
        if (isCorrect && !isBooster) {
          const meaningCheckInType = session.mode === 'review-only' ? 'review-meaning' : 'learn-meaning';
          await updateTodayCheckIn(session.userId, meaningCheckInType);
        }
      } catch (err) {
        console.error('Failed to persist learning result:', err);
      }
      
      // === Booster 专用逻辑 ===
      if (isBooster) {
        const exampleSentences = m.examples.map((rel, i) => ({ 
          id: i + 1, 
          sentence: String(rel.example.sentence || ''),
          translation: rel.example.translation 
        }));
        const cardData = {
          word: m.word.word,
          pronunciations: normalizePronunciation(m.word.pronunciation),
          definition: m.definition,
          partOfSpeech: m.partOfSpeech,
          examples: exampleSentences
        };

        if (isCorrect) {
          // Booster 答对：清空 currentWord，轻反馈，直接 continue-next
          session.currentWord = null;  // 关键：清空以便获取下一个单词
          
          return res.json({
            success: true,
            data: {
              sessionId: session.id,
              type: 'continue-next',
              data: {
                meaningId: m.id,
                isCorrect: true,
                isBooster: true,
                message: '短期强化完成 ✓'
              },
              step: session.step
            }
          });
        } else {
          // Booster 答错：清空 currentWord，显示简化教学卡片
          session.currentWord = null;  // 关键：清空以便获取下一个单词
          return res.json({
            success: true,
            data: {
              sessionId: session.id,
              type: 'show-card',
              data: {
                meaningId: m.id,
                isCorrect: false,
                isBooster: true,
                showResult: true,
                card: cardData,
                message: '需要再次巩固'
              },
              step: session.step
            }
          });
        }
      }
      
      // === 正常路径逻辑 ===
      const pathChoice = session.lastPath;
      let createdBooster = null as null | { ticketId: string; afterN: number };
      
      // 答错时创建 Booster（路径A和B都适用）
      if (!isCorrect) {
        if (await SessionService.getBoosterCount(session.userId, m.id, session) < 2) {
          const ticket = { id: randomUUID(), meaningId: m.id, afterN: 5, createdAt: new Date().toISOString() };
          session.boosters.push(ticket);
          createdBooster = { ticketId: ticket.id, afterN: ticket.afterN };
        }
      }

      const exampleSentences = m.examples.map((rel, i) => ({ 
        id: i + 1, 
        sentence: String(rel.example.sentence || ''),
        translation: rel.example.translation 
      }));
      const cardData = {
        word: m.word.word,
        pronunciations: normalizePronunciation(m.word.pronunciation),
        definition: m.definition,
        partOfSpeech: m.partOfSpeech,
        examples: exampleSentences
      };
      
      // 标记当前词义已学完
      session.currentWord.meanings[currentMeaningIndex].learned = true;
      
      // 路径 A（我认识）：答对直接继续（无需显示卡片，但用户需要点击继续）
      if (pathChoice === 'A' && isCorrect) {
        return res.json({ 
          success: true, 
          data: { 
            sessionId: session.id, 
            type: 'continue-next', 
            data: { 
              meaningId: m.id, 
              isCorrect: true,
              isBooster: false,
              message: '回答正确 ✓',
              wordProgress: {
                currentMeaning: currentMeaningIndex + 1,
                totalMeanings: session.currentWord.meanings.length
              }
            },
            step: session.step 
          } 
        });
      }
      
      // 路径 A 答错 或 路径 B（无论对错）：显示卡片
      return res.json({ 
        success: true, 
        data: { 
          sessionId: session.id, 
          type: 'show-card', 
          data: { 
            meaningId: m.id, 
            isCorrect, 
            showResult: true, // 显示对错反馈
            card: cardData,
            wordProgress: {
              currentMeaning: currentMeaningIndex + 1,
              totalMeanings: session.currentWord.meanings.length
            }
          }, 
          createdBooster, 
          step: session.step 
        } 
      });
    }

    // 处理拼写题提交 (复习模式 - production类型)
    if (action === 'submitSpelling') {
      const { meaningId, userInput } = payload || {};
      
      if (!session.currentWord) {
        return res.status(500).json({ success: false, message: '内部错误: 未找到当前单词' });
      }

      // 查询完整的词义信息
      const m = await prisma.meaning.findUnique({
        where: { id: meaningId },
        include: {
          word: {
            select: { id: true, word: true, pronunciation: true }
          },
          examples: {
            select: { 
              example: { select: { sentence: true, translation: true } },
              isPrimary: true
            }
          }
        }
      });
      
      if (!m) {
        return res.status(500).json({ success: false, message: '内部错误: 未找到当前词义' });
      }

      // 核心修复：后端校验拼写，不再信任前端 isCorrect
      // 归一化处理：转小写，移除首尾空格，移除标点符号
      const normalize = (str: string) => str.toLowerCase().trim().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");
      const normalizedInput = normalize(userInput || '');
      const normalizedTarget = normalize(m.word.word);
      
      const isCorrect = normalizedInput === normalizedTarget;
      
      // 记录学习结果
      try {
        await recordLearningResult(session.userId, meaningId, !!isCorrect);
        if (isCorrect) {
          const meaningCheckInType = session.mode === 'review-only' ? 'review-meaning' : 'learn-meaning';
          await updateTodayCheckIn(session.userId, meaningCheckInType);
        }
      } catch (err) {
        console.error('Failed to persist spelling result:', err);
      }
      
      const exampleSentences = m.examples.map((rel, i) => ({ 
        id: i + 1, 
        sentence: String(rel.example.sentence || ''),
        translation: rel.example.translation 
      }));
      const cardData = {
        word: m.word.word,
        pronunciations: normalizePronunciation(m.word.pronunciation),
        definition: m.definition,
        partOfSpeech: m.partOfSpeech,
        examples: exampleSentences,
        userInput // 包含用户输入用于显示
      };
      
      // 标记词义已学完
      const currentMeaningIndex = session.currentWord.currentMeaningIndex;
      session.currentWord.meanings[currentMeaningIndex].learned = true;
      
      // 如果答错,创建Booster
      if (!isCorrect) {
        if (await SessionService.getBoosterCount(session.userId, m.id, session) < 2) {
          const ticket = { id: randomUUID(), meaningId: m.id, afterN: 5, createdAt: new Date().toISOString() };
          session.boosters.push(ticket);
        }
      }
      
      // 返回卡片显示结果
      return res.json({
        success: true,
        data: {
          sessionId: session.id,
          type: 'show-card',
          data: {
            meaningId: m.id,
            isCorrect: !!isCorrect,
            showResult: true,
            card: cardData,
            isSpellingQuestion: true, // 标记这是拼写题的结果
            wordProgress: {
              currentMeaning: currentMeaningIndex + 1,
              totalMeanings: session.currentWord.meanings.length
            }
          },
          step: session.step
        }
      });
    }

    if (action === 'skipMeaning') {
      const { meaningId } = payload || {};
      if (meaningId) session.skipped.add(`meaning:${meaningId}`);
      const next = await SessionService.pickNextMeaningForSession(session);
      session.current = next ? { wordId: next.wordId, meaningId: next.meaningId, attempt: 1 } : null;
      const triggered = SessionService.tickSession(session);
      if (triggered && triggered.length > 0) {
        let chosen: SessionService.BoosterTicket | null = null;
        for (const t of triggered) {
          if ((await SessionService.getBoosterCount(session.userId, t.meaningId, session)) >= 2) continue;
          chosen = t; break;
        }
        if (chosen) {
          await SessionService.incBoosterCount(session.userId, chosen.meaningId, session);
          const q = await SessionService.makeQuestionForMeaning(chosen.meaningId);
          
          // 获取词义信息用于显示例句
          const meaningData = await prisma.meaning.findUnique({
            where: { id: chosen.meaningId },
            include: {
              word: { select: { id: true, word: true, pronunciation: true } },
              examples: {
                // where: { isPrimary: true }, // Remove isPrimary filter to ensure we get something
                take: 1,
                select: { example: { select: { sentence: true } } }
              }
            }
          });
          
          const sentence = meaningData?.examples[0]?.example.sentence || '';
          const wordInfo = meaningData ? {
            word: meaningData.word.word,
            lemma: meaningData.word.word,
            pronunciations: normalizePronunciation(meaningData.word.pronunciation)
          } : null;
          
          // 重要：设置 currentWord 为 Booster 词义所属的单词（仅包含该词义）
          if (meaningData) {
            session.currentWord = {
              wordId: meaningData.word.id,
              word: meaningData.word.word,
              lemma: meaningData.word.word,
              pronunciations: normalizePronunciation(meaningData.word.pronunciation),
              meanings: [{
                meaningId: meaningData.id,
                partOfSpeech: meaningData.partOfSpeech || '',
                definition: meaningData.definition || '',
                examples: meaningData.examples.map(rel => rel.example.sentence),
                learned: false
              }],
              currentMeaningIndex: 0,
              isBooster: true
            };
          }
          
          return res.json({ 
            success: true, 
            data: { 
              sessionId: session.id, 
              type: 'show-booster-question', 
              data: { 
                questionId: q.questionId, 
                meaningId: chosen.meaningId, 
                prompt: q.prompt, 
                options: q.options, 
                timeLimitSec: q.timeLimitSec, 
                isBooster: true,
                sentence,
                word: wordInfo
              }, 
              step: session.step 
            } 
          });
        }
      }
      return res.json({ success: true, data: { type: 'next-meaning', data: { next: session.current ? { word: { id: session.current.wordId }, meaningId: session.current.meaningId } : null }, step: session.step } });
    }

    if (action === 'heartbeat') {
      return res.json({ success: true, data: { sessionId: session.id, state: session.state, step: session.step, boosterCount: session.boosters.length } });
    }

    return res.status(400).json({ success: false, message: '未知 action' });
  } catch (error) {
    console.error('actionSession error', error);
    res.status(500).json({ success: false, message: '服务器错误', error: (error as Error).message });
    return;
  }
};

export const getSessionState = async (req: AuthRequest, res: Response) => {
  try {
    const sessionId = req.params.sessionId;
    const session = SessionService.sessionStore.get(sessionId);
    if (!session) return res.status(404).json({ success: false, message: 'Session 未找到' });

    // 安全检查：确保 Session 属于当前用户
    const userId = req.user?.userId;
    if (session.userId !== userId) {
      return res.status(403).json({ success: false, message: '无权访问此 Session' });
    }

    return res.json({ success: true, data: { sessionId: session.id, state: session.state, currentStep: session.step, queueSummary: { boosterPending: session.boosters.length, reviewsPending: 0, newPending: 0 } } });
  } catch (error) {
    console.error('getSessionState error', error);
    res.status(500).json({ success: false, message: '服务器错误', error: (error as Error).message });
    return;
  }
};

export const getNextQuestions = async (req: AuthRequest, res: Response) => {
  try {
    const sessionId = req.params.sessionId;
    const session = SessionService.sessionStore.get(sessionId);
    if (!session) return res.status(404).json({ success: false, message: 'Session 未找到' });

    // 安全检查：确保 Session 属于当前用户
    const userId = req.user?.userId;
    if (session.userId !== userId) {
      return res.status(403).json({ success: false, message: '无权访问此 Session' });
    }

    const count = parseInt(req.query.count as string) || 3;
    
    // 重要：每次调用 getNextQuestions 时推进步骤，检查 Booster 是否到期
    const triggered = SessionService.tickSession(session);
    
    // 先检查是否有到期的 booster 需要触发
    if (triggered && triggered.length > 0) {
      let chosen: SessionService.BoosterTicket | null = null;
      for (const t of triggered) {
        if ((await SessionService.getBoosterCount(session.userId, t.meaningId, session)) >= 2) continue;
        chosen = t; break;
      }
      if (chosen) {
        await SessionService.incBoosterCount(session.userId, chosen.meaningId, session);
        const q = await SessionService.makeQuestionForMeaning(chosen.meaningId);
        
        // 获取词义信息用于显示例句
        const meaningData = await prisma.meaning.findUnique({
          where: { id: chosen.meaningId },
          include: {
            word: { select: { id: true, word: true, pronunciation: true } },
            examples: {
              // where: { isPrimary: true }, // Remove isPrimary filter
              take: 1,
              select: { example: { select: { sentence: true } } }
            }
          }
        });
        
        const sentence = meaningData?.examples[0]?.example.sentence || '';
        const wordInfo = meaningData ? {
          word: meaningData.word.word,
          lemma: meaningData.word.word,
          pronunciations: normalizePronunciation(meaningData.word.pronunciation)
        } : null;
        
        // 重要：设置 currentWord 为 Booster 词义所属的单词（仅包含该词义）
        if (meaningData) {
          session.currentWord = {
            wordId: meaningData.word.id,
            word: meaningData.word.word,
            lemma: meaningData.word.word,
            pronunciations: normalizePronunciation(meaningData.word.pronunciation),
            meanings: [{
              meaningId: meaningData.id,
              partOfSpeech: meaningData.partOfSpeech || '',
              definition: meaningData.definition || '',
              examples: meaningData.examples.map(rel => rel.example.sentence),
              learned: false
            }],
            currentMeaningIndex: 0,
            isBooster: true  // 标记这是 Booster 单词
          };
        }
        
        return res.json({ 
          success: true, 
          data: { 
            sessionId: session.id, 
            steps: [{ 
              type: 'show-booster-question', 
              data: { 
                questionId: q.questionId, 
                meaningId: chosen.meaningId, 
                prompt: q.prompt, 
                options: q.options, 
                timeLimitSec: q.timeLimitSec, 
                isBooster: true,
                sentence,
                word: wordInfo
              } 
            }] 
          } 
        });
      }
    }
    
    const steps: any[] = [];
    
    // 检查当前单词的下一个词义，或切换到新单词
    if (!session.currentWord) {
      // 检查每日目标是否完成 (仅在新学模式下)
      if (session.mode === 'new-only') {
        const today = getBeijingToday();
        const checkIn = await prisma.dailyCheckIn.findUnique({
          where: { userId_checkInDate: { userId: session.userId, checkInDate: today } }
        });
        
        // Use session goal (which was set from user config at session start)
        const goal = session.dailyGoal || 10;
        
        if (checkIn) {
          const totalCompleted = checkIn.wordsLearned + checkIn.wordsReviewed;
          if (totalCompleted >= goal) {
            return res.json({ 
              success: true, 
              data: { 
                sessionId: session.id, 
                steps: [{ 
                  type: 'session-complete', 
                  data: { 
                    message: '今日学习目标已完成！',
                    isGoalReached: true 
                  } 
                }] 
              } 
            });
          }
        }
      }

      // 获取新单词
      const nextWord = await SessionService.pickNextWordForSession(session);
      if (nextWord) {
        session.currentWord = {
          wordId: nextWord.wordId,
          word: nextWord.word,
          lemma: nextWord.lemma,
          pronunciations: nextWord.pronunciations,
          meanings: nextWord.meanings.map((m: any) => ({
            meaningId: m.meaningId,
            partOfSpeech: m.partOfSpeech,
            definition: m.definition,
            examples: m.examples,
            learned: false
          })),
          currentMeaningIndex: 0
        };
      } else {
        // 没有新单词了，返回完成
        return res.json({ success: true, data: { sessionId: session.id, steps: [{ type: 'session-complete', data: { message: '已完成所有待学内容' } }] } });
      }
    }
    
    // 检查当前单词的所有词义是否学完
    const allMeaningsLearned = session.currentWord.meanings.every((m: any) => m.learned);
    
    if (allMeaningsLearned) {
      // 该单词所有词义已学完 → 显示单词总结页
      const wordKey = `word:${session.currentWord.wordId}`;
      session.learned.add(wordKey);
      
      // 更新今日打卡记录（单词级别）
      // 根据模式区分新学和复习
      try {
        const checkInType = session.mode === 'review-only' ? 'review' : 'learn';
        await updateTodayCheckIn(session.userId, checkInType);
      } catch (err) {
        console.error('Failed to update checkin:', err);
      }
      
      const wordSummary = {
        wordId: session.currentWord.wordId,
        word: session.currentWord.word,
        lemma: session.currentWord.lemma,
        pronunciations: normalizePronunciation(session.currentWord.pronunciations),
        meanings: session.currentWord.meanings.map((m: any) => ({
          meaningId: m.meaningId,
          partOfSpeech: m.partOfSpeech,
          definition: m.definition,
          examples: m.examples
        }))
      };
      
      // 清空 currentWord，准备获取下一个单词
      session.currentWord = null;
      
      return res.json({
        success: true,
        data: {
          sessionId: session.id,
          steps: [{
            type: 'show-word-summary',
            data: { word: wordSummary }
          }]
        }
      });
    }
    
    // 未学完 → 找到下一个未学的词义
    const nextMeaningIndex = session.currentWord.meanings.findIndex((m: any) => !m.learned);
    if (nextMeaningIndex !== -1) {
      session.currentWord.currentMeaningIndex = nextMeaningIndex;
      const nextMeaning = session.currentWord.meanings[nextMeaningIndex];
      const exObj = nextMeaning.examples[0] || '';
      const sentence = getSafeSentence(exObj);
      const translation = typeof exObj === 'string' ? '' : (exObj?.translation || '');
      
      // 根据session.mode判断返回类型
      if (session.mode === 'review-only') {
        // 复习模式: 直接出题,不显示三路径选择
        const masteryFocus = await prisma.wordTagRelation.findFirst({
          where: {
            wordId: session.currentWord.wordId,
            bookTagId: session.bookTagId || undefined
          },
          select: { masteryFocus: true }
        });

        const questionType = masteryFocus?.masteryFocus === 'production' ? 'production' : 'recognition';
        
        if (questionType === 'production') {
          // 拼写题
          steps.push({
            type: 'show-spelling-question',
            data: {
              word: {
                id: session.currentWord.wordId,
                word: session.currentWord.word,
                lemma: session.currentWord.lemma,
                pronunciations: normalizePronunciation(session.currentWord.pronunciations)
              },
              meaningId: nextMeaning.meaningId,
              definition: nextMeaning.definition,
              partOfSpeech: nextMeaning.partOfSpeech,
              sentence,
              translation,
              highlightWord: session.currentWord.word,
              prompt: '请根据释义和例句拼写单词',
              wordProgress: {
                currentMeaning: nextMeaningIndex + 1,
                totalMeanings: session.currentWord.meanings.length
              }
            }
          });
        } else {
          // 识别题: 四选一
          const question = await SessionService.makeQuestionForMeaning(nextMeaning.meaningId);
          steps.push({
            type: 'show-question',
            data: {
              word: {
                id: session.currentWord.wordId,
                word: session.currentWord.word,
                lemma: session.currentWord.lemma,
                pronunciations: normalizePronunciation(session.currentWord.pronunciations)
              },
              meaningId: nextMeaning.meaningId,
              sentence,
              translation,
              highlightWord: session.currentWord.word,
              prompt: question.prompt,
              options: question.options,
              wordProgress: {
                currentMeaning: nextMeaningIndex + 1,
                totalMeanings: session.currentWord.meanings.length
              }
            }
          });
        }
      } else {
        // 新学模式: 显示三路径选择
        steps.push({
          type: 'show-sentence',
          data: {
            word: {
              id: session.currentWord.wordId,
              word: session.currentWord.word,
              lemma: session.currentWord.lemma,
              pronunciations: normalizePronunciation(session.currentWord.pronunciations)
            },
            meaningId: nextMeaning.meaningId,
            sentence,
            translation,
            highlightWord: session.currentWord.word,
            wordProgress: {
              currentMeaning: nextMeaningIndex + 1,
              totalMeanings: session.currentWord.meanings.length
            }
          }
        });
      }
    }
    
    return res.json({ success: true, data: { sessionId: session.id, steps } });
  } catch (error) {
    console.error('getNextQuestions error', error);
    res.status(500).json({ success: false, message: '服务器错误', error: (error as Error).message });
    return;
  }
};