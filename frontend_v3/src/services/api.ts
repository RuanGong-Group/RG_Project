/**
 * API 服务层
 * 严格基于 BACKEND_API_ACTUAL_RESPONSES.md
 */

import { apiClient } from './axios';
import type {
  ApiResponse,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  Book,
  UpdateCurrentBookRequest,
  TodayPlanResponse,
  NextWordResponse,
  SubmitProgressRequest,
  SubmitProgressResponse,
  TodayReviewResponse,
  ReviewSubmitRequest,
  ReviewSubmitResponse,
  StatsOverview,
  StatsProgressResponse,
} from '../types/api';

// ============================================
// Auth API
// ============================================

export const authApi = {
  /**
   * 用户注册
   * POST /api/auth/register
   */
  async register(data: RegisterRequest): Promise<RegisterResponse> {
    const response = await apiClient.post<ApiResponse<RegisterResponse>>(
      '/auth/register',
      data
    );
    return response.data.data;
  },

  /**
   * 用户登录
   * POST /api/auth/login
   */
  async login(data: LoginRequest): Promise<LoginResponse> {
    console.log('📡 API: 发送登录请求', data.username);
    const response = await apiClient.post<ApiResponse<LoginResponse>>(
      '/auth/login',
      data
    );
    console.log('📡 API: 收到响应', response.data);
    return response.data.data;
  }
};

// ============================================
// Book API
// ============================================

export const bookApi = {
  /**
   * 获取所有词书
   * GET /api/books
   */
  async getAllBooks(): Promise<Book[]> {
    const response = await apiClient.get<ApiResponse<Book[]>>('/books');
    return response.data.data;
  },

  /**
   * 获取当前学习词书
   * GET /api/user/current-book
   */
  async getCurrentBook(): Promise<Book | null> {
    const response = await apiClient.get<ApiResponse<Book | null>>('/user/current-book');
    return response.data.data;
  },

  /**
  * 切换当前学习词书
  * PUT /api/user/current-book
  * 请求体字段使用后端权威 `bookTagId`
   */
  async updateCurrentBook(data: UpdateCurrentBookRequest): Promise<Book> {
    const response = await apiClient.put<ApiResponse<Book>>('/user/current-book', data);
    return response.data.data;
  },

  /**
   * 获取词书中的单词列表（已应用稳定乱序）
   * GET /api/books/:bookId/words
   */
  async getBookWords(bookId: number, limit = 20, includeProgress = true): Promise<{
    bookId: number;
    bookName: string;
    salt: string;
    words: Array<{
      wordId: number;
      word: string;
      lemma: string;
      pronunciations: any;
      meanings: Array<{
        meaningId: number;
        partOfSpeech: string;
        definition: string;
        progress?: {
          masteryLevel: number;
          nextReviewAt: string;
        } | null;
      }>;
    }>;
    total: number;
  }> {
    const response = await apiClient.get(`/books/${bookId}/words?limit=${limit}&includeProgress=${includeProgress}`);
    return response.data.data;
  },

  /**
   * 重新乱序词书
   * POST /api/books/:bookId/reshuffle
   */
  async reshuffleBook(bookId: number): Promise<{
    bookId: number;
    oldSalt: string;
    newSalt: string;
  }> {
    const response = await apiClient.post(`/books/${bookId}/reshuffle`);
    return response.data.data;
  }
};

// ============================================
// Learning API
// ============================================

export const learningApi = {
  /**
   * 获取今日学习计划
   * GET /api/learning/today-plan
   */
  async getTodayPlan(): Promise<TodayPlanResponse> {
    const response = await apiClient.get<ApiResponse<TodayPlanResponse>>('/learning/today-plan');
    return response.data.data;
  },

  /**
   * 获取下一个要学习的单词或状态 (V2)
   * GET /api/learning/word/next
   */
  async getNextWord(): Promise<NextWordResponse> {
    const response = await apiClient.get<ApiResponse<any>>('/learning/word/next');
    // 如果后端返回了 code 字段（在 response.data 层级），说明是特殊状态
    if ('code' in response.data && response.data.data === null) {
      return {
        code: response.data.code as 'REVIEW_FIRST' | 'GOAL_MET' | 'BOOK_COMPLETED',
        message: response.data.message
      };
    }
    // 否则返回正常的单词数据
    return response.data.data;
  },

  /**
   * 提交一个单词的学习进度 (V2)
   * POST /api/learning/progress
   */
  async submitProgress(data: SubmitProgressRequest): Promise<SubmitProgressResponse> {
    const response = await apiClient.post<ApiResponse<SubmitProgressResponse>>('/learning/progress', data);
    return response.data.data;
  }
};

/**
 * Learning Session (三路径) API
 */
export const learningSessionApi = {
  /**
   * Start a session
   * POST /api/learning/session/start
   */
  async startSession(data?: any): Promise<any> {
    const response = await apiClient.post<ApiResponse<any>>('/learning/session/start', data || {});
    return response.data.data;
  },

  /**
   * Action on session (choosePath / submitAnswer / skipMeaning / heartbeat)
   * POST /api/learning/session/action
   */
  async actionSession(payload: { sessionId: string; action: string; payload?: any }): Promise<any> {
    const response = await apiClient.post<ApiResponse<any>>('/learning/session/action', payload);
    return response.data.data;
  },

  /**
   * Get session state
   * GET /api/learning/session/:sessionId/state
   */
  async getSessionState(sessionId: string): Promise<any> {
    const response = await apiClient.get<ApiResponse<any>>(`/learning/session/${encodeURIComponent(sessionId)}/state`);
    return response.data.data;
  }
  ,
  /**
   * Get next questions/steps for a session
   * GET /api/learning/session/:sessionId/next-questions?count=N
   */
  async getNextQuestions(sessionId: string, count = 3): Promise<any> {
    const response = await apiClient.get<ApiResponse<any>>(`/learning/session/${encodeURIComponent(sessionId)}/next-questions?count=${count}`);
    return response.data.data;
  }
};

/**
 * 复习相关API
 */
export const reviewApi = {
  /**
   * 获取今日复习任务
   * GET /api/learning/review/today
   */
  async getTodayReview(): Promise<TodayReviewResponse> {
    const response = await apiClient.get<ApiResponse<TodayReviewResponse>>('/learning/review/today');
    return response.data.data;
  },

  /**
   * 提交复习结果
   * POST /api/learning/review/submit
   */
  async submitReview(data: ReviewSubmitRequest): Promise<ReviewSubmitResponse> {
    const response = await apiClient.post<ApiResponse<ReviewSubmitResponse>>('/learning/review/submit', data);
    return response.data.data;
  }
};

/**
 * 统计相关API
 */
export const statsApi = {
  /**
   * 获取学习概览
   * GET /api/stats/overview
   */
  async getOverview(): Promise<StatsOverview> {
    const response = await apiClient.get<ApiResponse<StatsOverview>>('/stats/overview');
    return response.data.data;
  },

  /**
   * 获取学习进度
   * GET /api/stats/progress?days=7
   */
  async getProgress(days: 7 | 30 = 7): Promise<StatsProgressResponse> {
    const response = await apiClient.get<ApiResponse<StatsProgressResponse>>(`/stats/progress?days=${days}`);
    return response.data.data;
  }
};
