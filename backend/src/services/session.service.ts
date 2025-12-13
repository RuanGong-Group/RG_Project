import { randomUUID } from 'crypto';
import prisma from '../utils/prisma';
import { getStore, dailyKeyForBooster, secondsUntilMidnight } from '../utils/redis';
import { getDueReviews, getNewMeanings, recordLearningResult } from './learning.service';

export type BoosterTicket = { id: string; meaningId: number; afterN: number; createdAt: string };

// In-memory session store
const sessions = new Map<string, any>();
const store = getStore();

export const sessionStore = {
  get: (id: string) => sessions.get(id),
  set: (id: string, session: any) => sessions.set(id, session),
  delete: (id: string) => sessions.delete(id)
};

export async function getBoosterCount(userId: number, meaningId: number, sessionFallback: any): Promise<number> {
  if (store && store.isRedis) {
    const key = dailyKeyForBooster(userId, meaningId);
    return await store.getInt(key);
  }
  return sessionFallback.boosterCounts ? (sessionFallback.boosterCounts[meaningId] || 0) : 0;
}

export async function incBoosterCount(userId: number, meaningId: number, sessionFallback: any): Promise<number> {
  if (store && store.isRedis) {
    const key = dailyKeyForBooster(userId, meaningId);
    const ttl = secondsUntilMidnight();
    return await store.incrWithExpiry(key, ttl);
  }
  sessionFallback.boosterCounts[meaningId] = (sessionFallback.boosterCounts[meaningId] || 0) + 1;
  return sessionFallback.boosterCounts[meaningId];
}

export async function pickNextWordForSession(session: any) {
  const { mode = 'new-only' } = session;
  
  // Mode: review-only
  if (mode === 'review-only') {
    const dueIds = await getDueReviews(session.userId, 10);
    if (dueIds.length === 0) return null;
    
    const dueWordIds = new Set<number>();
    for (const meaningId of dueIds) {
      const meaning = await prisma.meaning.findUnique({
        where: { id: meaningId },
        select: { wordId: true }
      });
      if (meaning) dueWordIds.add(meaning.wordId);
    }

    for (const meaningId of dueIds) {
      const meaningKey = `meaning:${meaningId}`;
      if (!session.learned.has(meaningKey) && !session.skipped.has(meaningKey)) {
        const meaning = await prisma.meaning.findUnique({
          where: { id: meaningId },
          select: { wordId: true }
        });
        if (!meaning) continue;
        
        const wordData = await prisma.word.findUnique({
          where: { id: meaning.wordId },
          select: {
            id: true,
            word: true,
            lemma: true,
            pronunciation: true,
            meanings: {
              where: { id: meaningId },
              select: {
                id: true,
                partOfSpeech: true,
                definition: true,
                examples: {
                  // where: { isPrimary: true },
                  orderBy: { exampleId: 'asc' }, // Ensure stability: Real exam examples (lower IDs) come first
                  take: 3,
                  select: { example: { select: { id: true, sentence: true, translation: true } } }
                }
              }
            }
          }
        });
        if (wordData && wordData.meanings.length > 0) {
          return {
            wordId: wordData.id,
            word: wordData.word,
            lemma: wordData.lemma || wordData.word,
            pronunciations: wordData.pronunciation,
            meanings: wordData.meanings.map((m: any) => ({
              meaningId: m.id,
              partOfSpeech: m.partOfSpeech || '',
              definition: m.definition || '',
              examples: m.examples.map((rel: any) => ({
                id: rel.example.id,
                sentence: rel.example.sentence,
                translation: rel.example.translation
              }))
            }))
          };
        }
      }
    }
    return null;
  }
  
  // Mode: new-only
  if (mode === 'new-only') {
    const newIds = await getNewMeanings(session.userId, session.bookTagId, 20);
    if (newIds.length === 0) return null;
    
    const newWordIds = new Set<number>();
    for (const meaningId of newIds) {
      const meaning = await prisma.meaning.findUnique({
        where: { id: meaningId },
        select: { wordId: true }
      });
      if (meaning) newWordIds.add(meaning.wordId);
    }

    for (const wordId of Array.from(newWordIds)) {
      const wordKey = `word:${wordId}`;
      if (!session.learned.has(wordKey) && !session.skipped.has(wordKey)) {
        const wordData = await prisma.word.findUnique({
          where: { id: wordId },
          select: {
            id: true,
            word: true,
            lemma: true,
            pronunciation: true,
            meanings: {
              where: { id: { in: newIds} },
              select: {
                id: true,
                partOfSpeech: true,
                definition: true,
                examples: {
                  // where: { isPrimary: true },
                  orderBy: { exampleId: 'asc' }, // Ensure stability: Real exam examples (lower IDs) come first
                  take: 3,
                  select: { example: { select: { id: true, sentence: true, translation: true } } }
                }
              }
            }
          }
        });
        if (wordData && wordData.meanings.length > 0) {
          return {
            wordId: wordData.id,
            word: wordData.word,
            lemma: wordData.lemma || wordData.word,
            pronunciations: wordData.pronunciation,
            meanings: wordData.meanings.map((m: any) => ({
              meaningId: m.id,
              partOfSpeech: m.partOfSpeech || '',
              definition: m.definition || '',
              examples: m.examples.map((rel: any) => ({
                id: rel.example.id,
                sentence: rel.example.sentence,
                translation: rel.example.translation
              }))
            }))
          };
        }
      }
    }
    
    // Fallback: No more words available
    return null;
  }
  
  return null;
}

export async function pickNextMeaningForSession(session: any) {
  // Priority 1: Check due reviews first
  const dueIds = await getDueReviews(session.userId, 10);
  for (const meaningId of dueIds) {
    const key = `meaning:${meaningId}`;
    if (!session.learned.has(key) && !session.skipped.has(key)) {
      const meaning = await prisma.meaning.findUnique({
        where: { id: meaningId },
        select: { id: true, wordId: true }
      });
      if (meaning) {
        return { meaningId: meaning.id, wordId: meaning.wordId };
      }
    }
  }

  // Priority 2: Get new meanings from book
  const newIds = await getNewMeanings(session.userId, session.bookTagId, 20);
  for (const meaningId of newIds) {
    const key = `meaning:${meaningId}`;
    if (!session.learned.has(key) && !session.skipped.has(key)) {
      const meaning = await prisma.meaning.findUnique({
        where: { id: meaningId },
        select: { id: true, wordId: true }
      });
      if (meaning) {
        return { meaningId: meaning.id, wordId: meaning.wordId };
      }
    }
  }

  // Fallback: No more meanings available
  return null;
}

export function tickSession(session: any) {
  session.step += 1;
  session.updatedAt = new Date().toISOString();
  const triggered: BoosterTicket[] = [];
  for (let i = 0; i < session.boosters.length; i++) {
    const t = session.boosters[i];
    t.afterN -= 1;
    if (t.afterN <= 0) triggered.push(t);
  }
  session.boosters = session.boosters.filter((t: BoosterTicket) => t.afterN > 0);
  return triggered;
}

export async function makeQuestionForMeaning(meaningId: number) {
  // Get target meaning from database
  const targetMeaning = await prisma.meaning.findUnique({
    where: { id: meaningId },
    select: { 
      definition: true, 
      wordId: true, 
      partOfSpeech: true,  // ← 新增：获取词性
      extra: true          // ← 新增：获取扩展信息（同义词等）
    }
  });

  if (!targetMeaning) {
    throw new Error(`Meaning not found: ${meaningId}`);
  }

  const correctText = targetMeaning.definition;

  // 改进策略：优先从同词性的词义中选择干扰项
  // 从更大的池子中随机选择，提高随机性和混淆度
  const distractors = await prisma.meaning.findMany({
    where: {
      id: { not: meaningId },
      wordId: { not: targetMeaning.wordId },
      partOfSpeech: targetMeaning.partOfSpeech  // ← 核心改进：限制为同词性
    },
    select: { definition: true },
    take: 50  // ← 改进：取50个候选（而不是15个），提高随机性
  });

  // 如果同词性的干扰项不足3个，降级为不限词性
  if (distractors.length < 3) {
    console.warn(`[makeQuestion] 词义 ${meaningId} 的同词性干扰项不足，降级为不限词性`);
    const fallbackDistractors = await prisma.meaning.findMany({
      where: {
        id: { not: meaningId },
        wordId: { not: targetMeaning.wordId }
      },
      select: { definition: true },
      take: 50
    });
    
    // 从候选中随机选3个
    const shuffled = fallbackDistractors.sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, 3).map(d => d.definition);
    
    // 组合并打乱选项
    const allOptions = [correctText, ...selected];
    for (let i = allOptions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allOptions[i], allOptions[j]] = [allOptions[j], allOptions[i]];
    }
    
    const opts = allOptions.map((t, idx) => ({ id: idx + 1, text: t }));
    return { questionId: randomUUID(), options: opts, prompt: '请选择正确含义', timeLimitSec: 5, correctText };
  }

  // 从50个同词性候选中随机选3个作为干扰项
  const shuffled = distractors.sort(() => Math.random() - 0.5);
  
  // 确保不选择与正确答案重复的选项
  const selected: string[] = [];
  for (const d of shuffled) {
    if (selected.length >= 3) break;
    if (d.definition !== correctText && !selected.includes(d.definition)) {
      selected.push(d.definition);
    }
  }
  
  // 如果不足3个，继续添加（避免极端情况）
  while (selected.length < 3 && selected.length < shuffled.length) {
    const candidate = shuffled[selected.length].definition;
    if (!selected.includes(candidate) && candidate !== correctText) {
      selected.push(candidate);
    }
  }

  // 组合正确答案和干扰项
  const allOptions = [correctText, ...selected];
  
  // 打乱所有选项（Fisher-Yates shuffle）
  for (let i = allOptions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allOptions[i], allOptions[j]] = [allOptions[j], allOptions[i]];
  }

  const opts = allOptions.map((t, idx) => ({ id: idx + 1, text: t }));
  return { questionId: randomUUID(), options: opts, prompt: '请选择正确含义', timeLimitSec: 5, correctText };
}
