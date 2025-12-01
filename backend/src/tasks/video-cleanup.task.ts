import fs from 'fs';
import path from 'path';
import prisma from '../utils/prisma';

/**
 * 视频清理任务
 * 每天凌晨 02:00 执行
 * 清理 createdAt < Today 的视频物理文件，并更新数据库状态
 */
export async function cleanupOldVideos() {
  console.log('[VideoCleanup] Starting video cleanup task...');
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    // 1. 查找所有非今日且有视频路径的任务
    const oldJobs = await prisma.videoGenerationJob.findMany({
      where: {
        createdAt: {
          lt: today
        },
        videoPath: {
          not: null
        }
      }
    });

    console.log(`[VideoCleanup] Found ${oldJobs.length} old video jobs to clean.`);

    let cleanedCount = 0;
    let errorCount = 0;

    for (const job of oldJobs) {
      if (!job.videoPath) continue;

      try {
        // 检查文件是否存在
        if (fs.existsSync(job.videoPath)) {
          fs.unlinkSync(job.videoPath);
          console.log(`[VideoCleanup] Deleted file: ${job.videoPath}`);
        } else {
          console.log(`[VideoCleanup] File not found (already deleted?): ${job.videoPath}`);
        }

        // 更新数据库状态
        await prisma.videoGenerationJob.update({
          where: { id: job.id },
          data: {
            videoPath: null, // 清除路径
            videoUrl: null,  // 清除 URL (假设 URL 也是指向本地文件的映射)
            status: 'cleaned' // 自定义状态，或者保持 completed 但路径为空
          }
        });

        cleanedCount++;
      } catch (err) {
        console.error(`[VideoCleanup] Failed to clean job ${job.jobId}:`, err);
        errorCount++;
      }
    }

    console.log(`[VideoCleanup] Cleanup finished. Cleaned: ${cleanedCount}, Errors: ${errorCount}`);
  } catch (error) {
    console.error('[VideoCleanup] Fatal error during cleanup:', error);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  cleanupOldVideos()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
