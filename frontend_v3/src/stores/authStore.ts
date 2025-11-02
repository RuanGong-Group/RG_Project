/**
 * 认证状态管理
 * 使用 Zustand
 */

import { create } from 'zustand';
import { authApi } from '../services/api';
import type { User, LoginRequest, RegisterRequest } from '../types/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (credentials: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  initAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('jm_token'),
  isAuthenticated: !!localStorage.getItem('jm_token'),
  isLoading: false,
  error: null,

  initAuth: () => {
    const token = localStorage.getItem('jm_token');
    if (token) {
      // Token 存在，标记为已认证
      // 注意：user 信息会在首次 API 调用时通过响应获取
      set({
        token,
        isAuthenticated: true
      });
    }
  },

  login: async (credentials) => {
    console.log('🔐 Store: 开始登录请求...');
    set({ isLoading: true, error: null });
    try {
      const response = await authApi.login(credentials);
      console.log('📦 Store: 收到响应', response);
      
      // 保存 token 到 localStorage
      localStorage.setItem('jm_token', response.token);
      console.log('💾 Store: Token 已保存');
      
      set({
        user: response.user,
        token: response.token,
        isAuthenticated: true,
        isLoading: false,
        error: null
      });
      console.log('✅ Store: 状态已更新', { user: response.user, isAuthenticated: true });
    } catch (error) {
      console.error('❌ Store: 登录失败', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : '登录失败'
      });
      throw error;
    }
  },

  register: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authApi.register(data);
      set({
        user: response.user,
        isLoading: false,
        error: null
      });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : '注册失败'
      });
      throw error;
    }
  },

  logout: () => {
    localStorage.removeItem('jm_token');
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      error: null
    });
  },

  clearError: () => {
    set({ error: null });
  }
}));
