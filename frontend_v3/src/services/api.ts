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
  SubmitMeaningRequest,
  SubmitMeaningResponse,
  CompleteWordRequest,
  CompleteWordResponse,
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
   * 注意：请求体字段是 bookId 而非 bookTagId
   */
  async updateCurrentBook(data: UpdateCurrentBookRequest): Promise<Book> {
    const response = await apiClient.put<ApiResponse<Book>>('/user/current-book', data);
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
   * 获取下一个要学习的单词（包含所有词义）
   * GET /api/learning/word/next
   */
  async getNextWord(): Promise<NextWordResponse> {
    const response = await apiClient.get<ApiResponse<NextWordResponse>>('/learning/word/next');
    if (!response.data.data) {
      // 后端返回 null 表示学习完成
      throw new Error(response.data.message || '今日学习已完成');
    }
    return response.data.data;
  },

  /**
   * 提交单个词义的学习结果
   * POST /api/learning/meaning/submit
   * 注意：isCorrect 是布尔值（true = 认识，false = 不认识）
   */
  async submitMeaning(data: SubmitMeaningRequest): Promise<SubmitMeaningResponse> {
    const response = await apiClient.post<ApiResponse<SubmitMeaningResponse>>('/learning/meaning/submit', data);
    return response.data.data;
  },

  /**
   * 标记单词学习完成（所有词义学完后调用）
   * POST /api/learning/word/complete
   */
  async completeWord(data: CompleteWordRequest): Promise<CompleteWordResponse> {
    const response = await apiClient.post<ApiResponse<CompleteWordResponse>>('/learning/word/complete', data);
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
