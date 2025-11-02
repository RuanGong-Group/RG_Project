/**
 * Axios 实例配置
 * 严格按照后端实际响应格式处理
 */

import axios, { AxiosError } from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 请求拦截器：添加 token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('jm_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器：统一处理错误
apiClient.interceptors.response.use(
  (response) => {
    // 检查后端返回的 success 字段
    if (response.data && response.data.success === false) {
      return Promise.reject(new Error(response.data.message || '请求失败'));
    }
    return response;
  },
  (error: AxiosError<{ success: boolean; message: string }>) => {
    // 处理 401 未授权
    if (error.response?.status === 401) {
      // 只有在非登录页面时才清理 token 并跳转
      if (!window.location.pathname.includes('/login')) {
        localStorage.removeItem('jm_token');
        window.location.href = '/login';
      }
      // 登录页面的 401 错误直接返回，让登录表单处理
      return Promise.reject(new Error(error.response?.data?.message || '认证失败'));
    }

    // 提取错误信息
    const message = error.response?.data?.message || error.message || '网络错误';
    return Promise.reject(new Error(message));
  }
);
