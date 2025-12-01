import { PrismaClient, VideoGenerationJob } from '@prisma/client';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import prisma from '../utils/prisma';

// Use process.cwd() to ensure correct path in both dev and prod (assuming run from project root)
const PYTHON_SCRIPT_PATH = path.join(process.cwd(), 'scripts/video_gen/generate_daily_video.py');
// Detect python executable (use venv if available)
const VENV_PYTHON = path.join(process.cwd(), 'scripts/video_gen/venv/Scripts/python.exe'); // Windows
const SYSTEM_PYTHON = 'python';

const getPythonCommand = () => {
  if (fs.existsSync(VENV_PYTHON)) {
    return VENV_PYTHON;
  }
  return SYSTEM_PYTHON;
};

interface WordData {
  word: string;
  meaning: string;
  id?: number;
}

export class VideoService {
  /**
   * 创建并启动视频生成任务
   */
  static async createGenerationJob(
    userId: number,
    words: WordData[],
    videoType: 'daily_learning' | 'daily_review' | 'custom' = 'daily_learning',
    templateType: string = 'mystery'
  ): Promise<VideoGenerationJob> {
    // 1. 创建数据库记录
    const job = await prisma.videoGenerationJob.create({
      data: {
        userId,
        jobId: crypto.randomUUID(),
        videoType,
        wordIds: words.map(w => w.id || 0), // Store IDs if available
        templateType,
        status: 'pending',
        progress: 0,
      },
    });

    // 2. 异步启动 Python 脚本
    this.runPythonScript(job.jobId, words, templateType).catch(err => {
      console.error(`[VideoService] Failed to start script for job ${job.jobId}:`, err);
      this.updateJobStatus(job.jobId, 'failed', 0, err.message);
    });

    return job;
  }

  /**
   * 执行 Python 脚本
   */
  private static async runPythonScript(jobId: string, words: WordData[], style: string) {
    const pythonCmd = getPythonCommand();
    const wordsJson = JSON.stringify(words);

    console.log(`[VideoService] Starting job ${jobId} with ${words.length} words...`);
    console.log(`[VideoService] Script path: ${PYTHON_SCRIPT_PATH}`);

    const process = spawn(pythonCmd, [
      PYTHON_SCRIPT_PATH,
      '--words', wordsJson,
      '--jobId', jobId,
      '--style', style
    ]);

    // 更新状态为处理中
    await this.updateJobStatus(jobId, 'processing', 5);

    // 监听标准输出 (JSON 日志)
    process.stdout.on('data', async (data) => {
      const lines = data.toString().split('\n');
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const log = JSON.parse(line);
          console.log(`[VideoGen ${jobId}]`, log);

          if (log.status) {
            // Map script status to DB status if needed, or just update progress
            let dbStatus = 'processing';
            if (log.status === 'completed') dbStatus = 'completed';
            if (log.status === 'failed' || log.status === 'error') dbStatus = 'failed';

            // 转换绝对路径为相对 URL 路径
            // 假设 log.video_path 是绝对路径，如 D:\桌面\RG_project\RG_data\videos\daily_xxx.mp4
            // 我们需要将其转换为 /api/static/videos/daily_xxx.mp4
            // 前提是 app.ts 中配置了 app.use('/api/static', express.static(RG_DATA_PATH));
            
            let videoUrl = null;
            if (log.video_path) {
              const fileName = path.basename(log.video_path);
              // 视频生成在 videos/daily 子目录下
              videoUrl = `/api/static/videos/daily/${fileName}`;
            }

            await prisma.videoGenerationJob.update({
              where: { jobId },
              data: {
                status: dbStatus,
                progress: log.progress,
                errorMessage: log.status === 'error' ? log.message : undefined,
                videoPath: log.video_path, // 保留绝对路径用于文件管理
                videoUrl: videoUrl,        // 生成可访问的 URL
                completedAt: dbStatus === 'completed' ? new Date() : undefined
              }
            });
          }
        } catch (e) {
          // Non-JSON output (debug info)
          console.log(`[VideoGen ${jobId} RAW]`, line);
        }
      }
    });

    // 监听错误输出
    process.stderr.on('data', (data) => {
      console.error(`[VideoGen ${jobId} ERR]`, data.toString());
    });

    // 监听进程退出
    process.on('close', async (code) => {
      console.log(`[VideoGen ${jobId}] Process exited with code ${code}`);
      if (code !== 0) {
        // Check if already marked as failed/completed to avoid overwriting
        const currentJob = await prisma.videoGenerationJob.findUnique({ where: { jobId } });
        if (currentJob && currentJob.status !== 'completed' && currentJob.status !== 'failed') {
           await this.updateJobStatus(jobId, 'failed', currentJob.progress, `Process exited with code ${code}`);
        }
      }
    });
  }

  /**
   * 更新任务状态
   */
  private static async updateJobStatus(jobId: string, status: string, progress: number, errorMessage?: string) {
    await prisma.videoGenerationJob.update({
      where: { jobId },
      data: {
        status,
        progress,
        errorMessage
      }
    });
  }

  /**
   * 获取任务状态
   */
  static async getJobStatus(jobId: string) {
    return prisma.videoGenerationJob.findUnique({
      where: { jobId }
    });
  }
  
  /**
   * 获取用户最近的任务
   */
  static async getUserJobs(userId: number, limit: number = 10) {
    return prisma.videoGenerationJob.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
  }

  /**
   * 获取用户今日的视频生成任务
   */
  static async getTodayJob(userId: number) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const job = await prisma.videoGenerationJob.findFirst({
      where: {
        userId,
        createdAt: {
          gte: today
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!job) return null;

    // Fetch words if wordIds exist
    let words: any[] = [];
    if (job.wordIds && Array.isArray(job.wordIds) && job.wordIds.length > 0) {
      const wordIds = job.wordIds as number[];
      words = await prisma.word.findMany({
        where: { id: { in: wordIds } },
        select: { id: true, word: true, pronunciation: true }
      });
    }

    return {
      ...job,
      words
    };
  }
}
