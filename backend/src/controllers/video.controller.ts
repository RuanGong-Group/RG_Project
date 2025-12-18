import { Request, Response, NextFunction } from 'express';
import { VideoService } from '../services/video.service';
import { getDailyWordsForVideo, getTodayLearnedNewWords, getTodayActiveWords } from '../services/learning.service';
import { AppError } from '../utils/AppError';
import { AuthRequest } from '../middleware/auth.middleware';

export const generateVideo = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthRequest).user?.userId;
    if (!userId) {
      return next(new AppError('User not authenticated', 401));
    }

    // 1. 每日限制检查
    const todayJob = await VideoService.getTodayJob(userId);
    // Allow retry if the previous job failed
    if (todayJob && todayJob.status !== 'failed') {
      return res.status(200).json({
        status: 'success',
        message: 'Today\'s video already generated',
        data: {
          jobId: todayJob.jobId,
          status: todayJob.status,
          videoPath: todayJob.videoPath,
          videoUrl: todayJob.videoUrl
        }
      });
    }

    // 2. 学习状态检查 (检查今日是否有活跃单词：新学或复习)
    const todayActiveWords = await getTodayActiveWords(userId);
    if (todayActiveWords.length === 0) {
       return next(new AppError('请先完成今日学习 (Please complete today\'s learning first)', 400));
    }

    let { words, videoType, templateType } = req.body;

    // 如果没有提供单词，自动获取今日单词
    if (!words || !Array.isArray(words) || words.length === 0) {
      // 默认获取 7 个单词 (Miller's Law: 7±2 是短时记忆的黄金区间，同时也适合 3-5 个场景的叙事密度)
      words = await getDailyWordsForVideo(userId, 7);
      
      if (words.length === 0) {
        return next(new AppError('No words available for learning today. Please select a word book first.', 400));
      }
    } else {
      // Validate word structure
      for (const w of words) {
        if (!w.word || !w.meaning) {
          return next(new AppError('Each word must have "word" and "meaning" fields', 400));
        }
      }
    }

    const job = await VideoService.createGenerationJob(userId, words, videoType, templateType);

    res.status(201).json({
      status: 'success',
      data: {
        jobId: job.jobId,
        status: job.status,
        message: 'Video generation started'
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getTodayVideo = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthRequest).user?.userId;
    if (!userId) {
      return next(new AppError('User not authenticated', 401));
    }

    const job = await VideoService.getTodayJob(userId);

    res.status(200).json({
      status: 'success',
      data: {
        // Only consider it "generated" if it completed successfully
        hasGenerated: !!job && job.status === 'completed',
        job
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getTodayNewWords = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthRequest).user?.userId;
    if (!userId) {
      return next(new AppError('User not authenticated', 401));
    }

    const words = await getTodayLearnedNewWords(userId);

    res.status(200).json({
      status: 'success',
      results: words.length,
      data: {
        words
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getJobStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthRequest).user?.userId;
    const { jobId } = req.params;
    const job = await VideoService.getJobStatus(jobId);

    if (!job) {
      return next(new AppError('Job not found', 404));
    }

    // Ensure user owns the job
    if (job.userId !== userId) {
      return next(new AppError('Not authorized to view this job', 403));
    }

    res.status(200).json({
      status: 'success',
      data: {
        job
      }
    });
  } catch (error) {
    next(error);
  }
};

export const listUserJobs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthRequest).user?.userId;
    if (!userId) {
      return next(new AppError('User not authenticated', 401));
    }

    const jobs = await VideoService.getUserJobs(userId);

    res.status(200).json({
      status: 'success',
      results: jobs.length,
      data: {
        jobs
      }
    });
  } catch (error) {
    next(error);
  }
};
