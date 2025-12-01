/**
 * 后端 API 类型定义
 * 严格基于 BACKEND_API_ACTUAL_RESPONSES.md 生成
 * 生成时间：2025-10-29
 * 
 * ⚠️ 警告：不要凭想象修改这些类型！
 * 所有字段名和结构都来自后端控制器的实际返回值
 */

// ============================================
// 通用响应包装类型
// ============================================

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
  code?: string;
}

export interface ApiError {
  success: false;
  message: string;
  error?: string;
}

// ============================================
// Auth 相关类型
// ============================================

export interface User {
  id: number;
  username: string;
  createdAt: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
}

export interface RegisterResponse {
  user: User;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

// ============================================
// Learning 相关类型
// ============================================

export interface Pronunciation {
  uk: string;
  us: string;
}

export interface Example {
  id: number;
  sentence: string;
  sourceType: string;
  sourceDetail: string;
}

export interface Meaning {
  meaningId: number;
  partOfSpeech: string;
  definition: string;
  extra: any | null;
  examples: Example[];
}

export interface WordToLearn {
  wordId: number;
  word: string;
  pronunciations: Pronunciation;
  lemma?: string | null;
  meanings: Meaning[];
  masteryFocus: 'recognition' | 'production';
  bookTag: string;
}

export interface LearningContent {
  meaningId: number;
  word: string;
  pronunciations: Pronunciation;
  partOfSpeech: string;
  definition: string;
  extra: any | null;
  examples: Example[];
  masteryFocus: 'recognition' | 'production';
  bookTag: string;
}

export interface LearningProgressUpdate {
  meaningId: number;
  isCorrect: boolean;
}

// ⚠️ 注意：POST /api/learning/progress 的实际请求体是 results 数组

export interface LearningProgressResponse {
  masteryLevel: number;
  nextReviewAt: string;
  consecutiveCorrect: number;
  reviewCount: number;
}

export interface ReviewItem {
  progressId: number;
  meaningId: number;
  word: string;
  pronunciations: Pronunciation;
  partOfSpeech: string;
  definition: string;
  extra: any | null;
  examples: Example[];
  reviewMode: 'recognition' | 'production';
  masteryLevel: number;
  reviewCount: number;
}

export interface TodayReviewResponse {
  totalReviews: number;
  bookTag: string;
  reviews: ReviewItem[];
}

export interface ReviewSubmitRequest {
  meaningId: number;
  isCorrect: boolean;
}

export interface ReviewSubmitResponse {
  meaningId: number;
  masteryLevel: number;
  nextReviewAt: string;
}

export interface MeaningSubmitRequest {
  meaningId: number;
  isCorrect: boolean;
}

export interface MeaningSubmitResponse {
  meaningId: number;
  isCorrect: boolean;
  masteryLevel: number;
  nextReviewAt: string;
  consecutiveCorrect: number;
  reviewCount: number;
}

export interface WordCompleteRequest {
  wordId: number;
}

export interface WordCompleteResponse {
  wordId: number;
  word: string;
  totalMeanings: number;
  learnedMeanings: number;
}

export interface WordPlanItem {
  wordId: number;
  word: string;
  dueMeanings: number;
  totalMeanings: number;
}

export interface NewWordItem {
  wordId: number;
  word: string;
  totalMeanings: number;
}

export interface TodayPlanResponse {
  dailyGoal: number;
  progress: {
    learned: number;
    reviewed: number;
    total: number;
  };
  review: {
    dueCount: number;
    words: WordPlanItem[];
  };
  newLearning: {
    quota: number;
    available: number;
    words: NewWordItem[];
  };
}

// ============================================
// Book 相关类型
// ============================================

export interface Book {
  id: number;
  tagName: string;
  isUserDefined: boolean;
  wordCount: number;
  createdAt: string;
}

export interface UpdateCurrentBookRequest {
  bookTagId: number; // 使用后端权威字段名 `bookTagId`
}

// ============================================
// Stats 相关类型
// ============================================

export interface StatsOverviewResponse {
  today: {
    learned: number;
    reviewed: number;
    total: number;
  };
  overall: {
    totalWordsInBook: number;
    learnedWords: number;
    masteredMeanings: number;
    progressPercentage: number;
  };
}

export interface ProgressCurveItem {
  date: string;
  learned: number;
  reviewed: number;
  total: number;
}

export interface StatsProgressResponse {
  period: {
    startDate: string;
    endDate: string;
    days: number;
  };
  summary: {
    totalLearned: number;
    totalReviewed: number;
    totalWords: number;
    activeDays: number;
  };
  curve: ProgressCurveItem[];
}

// ============================================
// Notebook 相关类型
// ============================================

export interface AddWordToNotebookRequest {
  wordId: number;
}

export interface NotebookEntry {
  id: number;
  userId: number;
  wordId: number;
  addedAt: string;
}

export interface NotebookMeaning {
  meaningId: number;
  partOfSpeech: string;
  definition: string;
  examples: {
    sentence: string;
    highlightWord: string;
  }[];
}

export interface NotebookWord {
  notebookId: number;
  wordId: number;
  word: string;
  pronunciations: Pronunciation;
  addedAt: string;
  meanings: NotebookMeaning[];
}

export interface NotebookWordsResponse {
  total: number;
  words: NotebookWord[];
}

// ============================================
// CheckIn 相关类型
// ============================================

export interface TodayCheckInResponse {
  checkedIn: boolean;
  checkInDate: string;
  wordsLearned: number;
  wordsReviewed: number;
  meaningsLearned: number;
  meaningsReviewed: number;
  dailyGoal: number;
  goalCompleted: boolean;
  consecutiveDays: number;
}

export interface CheckInHistoryItem {
  id: number;
  userId: number;
  checkInDate: string;
  wordsLearned: number;
  wordsReviewed: number;
  meaningsLearned: number;
  meaningsReviewed: number;
  dailyGoal: number;
  goalCompleted: boolean;
  consecutiveDays: number;
  createdAt: string;
  updatedAt: string;
}

export interface CheckInHistoryResponse {
  checkIns: CheckInHistoryItem[];
  statistics: {
    totalCheckInDays: number;
    maxConsecutiveDays: number;
    queryDays: number;
  };
}

// ============================================
// User Settings 相关类型
// ============================================

export interface DailyGoalResponse {
  userId: number;
  username: string;
  dailyGoal: number;
}

export interface UpdateDailyGoalRequest {
  dailyGoal: number;
}

// ============================================
// Learning Session 相关类型 (V2)
// ============================================

/**
 * GET /api/learning/word/next 的响应类型。
 * 可能是包含单词数据的 WordToLearn 对象，
 * 或一个表示特殊状态的 code 对象。
 */
export type NextWordResponse = WordToLearn | {
  code: 'REVIEW_FIRST' | 'GOAL_MET' | 'BOOK_COMPLETED';
  message: string;
};

/**
 * POST /api/learning/progress 的请求体类型。
 * 一次性提交一个单词下所有词义的学习结果。
 */
export interface SubmitProgressRequest {
  results: {
    meaningId: number;
    isCorrect: boolean;
  }[];
}

/**
 * POST /api/learning/progress 的响应类型。
 */
export interface SubmitProgressResponse {
  meaningId: number;
  masteryLevel: number;
  nextReviewAt: string;
}[]

// ============================================
// Learning Session (三路径 V3) 相关类型
// ============================================

export interface SessionWordBrief {
  id: number;
  word: string;
  lemma?: string | null;
  pronunciations?: Pronunciation | null;
}

export interface ShowSentencePayload {
  word: SessionWordBrief;
  meaningId: number;
  sentence: string;
  highlightWord: string;
  attempt: number;
}

export interface QuestionOption {
  id: number;
  text: string;
}

export interface ShowQuestionPayload {
  questionId: string;
  meaningId: number;
  prompt: string;
  options: QuestionOption[];
  timeLimitSec: number;
  isBooster?: boolean; // ✨ 2025-11-19 新增：区分普通题/Booster题
  sentence?: string; // ✨ 2025-11-19 新增：例句回顾
  word?: {
    word: string;
    lemma?: string;
    pronunciations?: Pronunciation;
  };
  wordProgress?: {
    currentMeaning: number;
    totalMeanings: number;
  };
}

export interface ShowCardPayload {
  meaningId: number;
  isCorrect?: boolean; // 是否答对
  showResult?: boolean; // 是否显示结果（Booster简化反馈时为false）
  card: {
    definition: string;
    partOfSpeech?: string;
    pronunciations?: Pronunciation | null;
    examples?: { id: number; sentence: string }[];
  };
  wordProgress?: {
    currentMeaning: number;
    totalMeanings: number;
  };
}

export type SessionResponse =
  | { sessionId: string; type: 'show-sentence'; data: ShowSentencePayload; step?: number }
  | { sessionId: string; type: 'show-question'; data: ShowQuestionPayload; step?: number }
  | { sessionId: string; type: 'show-booster-question'; data: ShowQuestionPayload; step?: number }
  | { sessionId: string; type: 'show-spelling-question'; data: any; step?: number } // 拼写题(复习模式-production)
  | { sessionId: string; type: 'show-card'; data: ShowCardPayload; step?: number }
  | { sessionId: string; type: 'show-word-summary'; data: any; step?: number }
  | { sessionId: string; type: 'next-meaning'; data: any; step?: number }
  | { sessionId: string; type: 'continue-next'; data?: any; step?: number; message?: string } // ✨ Booster答对后的轻反馈
  | { sessionId: string; type: 'session-complete'; data: any; step?: number };


// ============================================
// 统计相关类型
// ============================================

export interface MasteryDistribution {
  level0: number;
  level1: number;
  level2: number;
  level3: number;
  level4: number;
  level5: number;
}

export interface StatsOverview {
  totalWords: number;
  learnedWords: number;
  masteryDistribution: MasteryDistribution;
  progressPercentage?: number;
  masteredMeanings?: number;
  today?: {
    learned: number;
    reviewed: number;
    total: number;
  };
}

export interface ProgressDataPoint {
  date: string;
  learned: number;
  reviewed: number;
}

export interface StatsProgressResponse {
  progressData: ProgressDataPoint[];
}
