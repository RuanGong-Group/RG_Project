import { randomUUID } from 'crypto';
import prisma from '../utils/prisma';
import { getStore, dailyKeyForBooster, secondsUntilMidnight } from '../utils/redis';
import { getDueReviews, getNewMeanings, recordLearningResult } from './learning.service';

export type BoosterTicket = { id: string; meaningId: number; afterN: number; createdAt: string };

// Minimal in-memory demo implementation to match routes used by frontend/tests.
const words = [
  { 
    id: 5806, 
    word: 'word', 
    lemma: 'word', 
    pronunciations: { uk: '/wɜːd/', us: '/wɝːd/' }, 
    meanings: [ 
      { id: 9592, partOfSpeech: 'n.', definition: '单词，词', examples: ['Actions speak louder than words.'] }, 
      { id: 9593, partOfSpeech: 'n.', definition: '话语，言语', examples: ['I need to have a word with you about the project.'] }
    ] 
  },
  { 
    id: 5807, 
    word: 'study', 
    lemma: 'study', 
    pronunciations: { uk: '/ˈstʌdi/', us: '/ˈstʌdi/' }, 
    meanings: [ 
      { id: 9595, partOfSpeech: 'v.', definition: '学习，研究', examples: ['She is studying for her final exams.'] },
      { id: 9596, partOfSpeech: 'n.', definition: '学习，研究', examples: ['The study shows that exercise improves memory.'] }
    ] 
  }
];

// Add extra demo words
words.push(
  { id: 5901, word: 'example', lemma: 'example', pronunciations: { uk: '/ɪɡˈzɑːmpəl/', us: '/ɪɡˈzæmpəl/' }, meanings: [ { id: 9701, partOfSpeech: 'n.', definition: '示例，例子', examples: ['This is an example sentence.'] } ] },
  { id: 5902, word: 'practice', lemma: 'practice', pronunciations: { uk: '/ˈpræktɪs/', us: '/ˈpræktɪs/' }, meanings: [ { id: 9702, partOfSpeech: 'n.', definition: '练习，实践', examples: ['Practice makes perfect.'] } ] },
  { id: 5903, word: 'improve', lemma: 'improve', pronunciations: { uk: '/ɪmˈpruːv/', us: '/ɪmˈpruːv/' }, meanings: [ { id: 9703, partOfSpeech: 'v.', definition: '改进，提高', examples: ['You need to improve your grammar.'] } ] },
  { id: 5904, word: 'challenge', lemma: 'challenge', pronunciations: { uk: '/ˈtʃælɪndʒ/', us: '/ˈtʃælɪndʒ/' }, meanings: [ { id: 9704, partOfSpeech: 'n.', definition: '挑战', examples: ['This problem is a real challenge.'] } ] },
  { id: 5905, word: 'discover', lemma: 'discover', pronunciations: { uk: '/dɪˈskʌvə/', us: '/dɪˈskʌvər/' }, meanings: [ { id: 9705, partOfSpeech: 'v.', definition: '发现', examples: ['She discovered a new technique.'] } ] }
);

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
    
    // Fallback: Use hardcoded data if no database items
    for (const w of words) {
      for (const m of w.meanings) {
        const key = `meaning:${m.id}`;
        if (!session.learned.has(key) && !session.skipped.has(key)) {
          return null; 
        }
      }
    }
    
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

  // Fallback: Use hardcoded data if no database items
  for (const w of words) {
    for (const m of w.meanings) {
      const key = `meaning:${m.id}`;
      if (!session.learned.has(key) && !session.skipped.has(key)) {
        return { meaningId: m.id, wordId: w.id };
      }
    }
  }

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
    select: { definition: true, wordId: true }
  });

  if (!targetMeaning) {
    // Fallback to hardcoded data
    let correctText: string | null = null;
    for (const w of words) {
      const m = w.meanings.find((x: any) => x.id === meaningId);
      if (m) { correctText = m.definition; break; }
    }
    const options = [correctText];
    for (const w of words) {
      for (const m of w.meanings) {
        if (options.length >= 4) break;
        if (m.definition !== correctText) options.push(m.definition);
      }
      if (options.length >= 4) break;
    }
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }
    const opts = options.map((t, idx) => ({ id: idx + 1, text: t }));
    return { questionId: randomUUID(), options: opts, prompt: '请选择正确含义', timeLimitSec: 5, correctText };
  }

  const correctText = targetMeaning.definition;

  // Get distractor meanings from database (different word, avoid confusion)
  const distractors = await prisma.meaning.findMany({
    where: {
      id: { not: meaningId },
      wordId: { not: targetMeaning.wordId }
    },
    select: { definition: true },
    take: 15
  });

  const options = [correctText];
  for (const d of distractors) {
    if (options.length >= 4) break;
    if (d.definition !== correctText) options.push(d.definition);
  }

  // Shuffle options
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }

  const opts = options.map((t, idx) => ({ id: idx + 1, text: t }));
  return { questionId: randomUUID(), options: opts, prompt: '请选择正确含义', timeLimitSec: 5, correctText };
}
