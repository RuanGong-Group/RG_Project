import { apiClient } from './axios';

export interface VideoJob {
  id: number;
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cleaned';
  progress: number;
  videoPath?: string;
  videoUrl?: string;
  errorMessage?: string;
  createdAt: string;
  words?: {
    id: number;
    word: string;
    pronunciation?: any;
  }[];
}

export interface TodayVideoResponse {
  hasGenerated: boolean;
  job?: VideoJob;
}

export const videoService = {
  /**
   * 检查今日是否已生成视频
   */
  getTodayVideo: async (): Promise<TodayVideoResponse> => {
    const response = await apiClient.get('/video/today');
    return response.data.data;
  },

  /**
   * 生成今日视频
   */
  generateVideo: async (templateType: string = 'mystery'): Promise<{ jobId: string; status: string }> => {
    const response = await apiClient.post('/video/generate', {
      templateType
    });
    return response.data.data;
  },

  /**
   * 获取任务状态
   */
  getJobStatus: async (jobId: string): Promise<{ job: VideoJob }> => {
    const response = await apiClient.get(`/video/status/${jobId}`);
    return response.data.data;
  },

  /**
   * 获取今日已学新词（用于检查是否满足生成条件）
   */
  getTodayNewWords: async (): Promise<any[]> => {
    const response = await apiClient.get('/learning/today-new-words');
    return response.data.data.words;
  }
};
