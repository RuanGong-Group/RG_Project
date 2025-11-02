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
  highlightWord: string;
  source: string;
  difficulty: number;
}

export interface Meaning {
  meaningId: number;
  partOfSpeech: string;
  definition: string;
  relatedInfo: string | { synonyms?: string[]; examples?: string[] } | null;  // 可能是字符串、对象或 null
  examples: Example[];
}

export interface WordToLearn {
  wordId: number;
  word: string;
  pronunciation: Pronunciation;
  meanings: Meaning[];
  totalMeanings: number;
  masteryFocus: 'recognition' | 'production';
  bookTag: string;
}

export interface LearningContent {
  meaningId: number;
  word: string;
  pronunciation: Pronunciation;
  partOfSpeech: string;
  definition: string;
  relatedInfo: any | null;
  examples: Example[];
  masteryFocus: 'recognition' | 'production';
  bookTag: string;
}

export interface LearningProgressUpdate {
  meaningId: number;
  isCorrect: boolean;
}

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
  pronunciation: Pronunciation;
  partOfSpeech: string;
  definition: string;
  relatedInfo: string | { synonyms?: string[]; examples?: string[] } | null;
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
  isCorrect: boolean;
  masteryLevel: number;
  nextReviewAt: string;
  consecutiveCorrect: number;
  reviewCount: number;
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
  allocation: {
    reviewPriority: number;
    newLearningSlots: number;
    totalPlanned: number;
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
  bookId: number; // ⚠️ 注意：是 bookId 不是 bookTagId
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
  pronunciation: Pronunciation;
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
// Learning Session 相关类型
// ============================================

// NextWordResponse 复用已有的 WordToLearn 类型结构
export type NextWordResponse = WordToLearn;

export interface SubmitMeaningRequest {
  meaningId: number;
  isCorrect: boolean;  // true = 认识，false = 不认识
}

export interface SubmitMeaningResponse {
  meaningId: number;
  masteryLevel: number;
  nextReviewAt: string;
  consecutiveCorrect: number;
  reviewCount: number;
}

export interface CompleteWordRequest {
  wordId: number;
}

export interface CompleteWordResponse {
  wordId: number;
  word: string;
  totalMeanings: number;
  learnedMeanings: number;
}

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
