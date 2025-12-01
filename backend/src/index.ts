import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import sessionRoutes from './routes/session.routes';
import bookRoutes from './routes/book.routes';
import notebookRoutes from './routes/notebook.routes';
import statsRoutes from './routes/stats.routes';
import checkinRoutes from './routes/checkin.routes';
import videoRoutes from './routes/video.routes';
import commonRoutes from './routes/common.routes';
import prisma from './utils/prisma';
import { errorHandler } from './middleware/error.middleware';
import { AppError } from './utils/AppError';
import path from 'path';
import { cleanupOldVideos } from './tasks/video-cleanup.task';

// 加载环境变量
dotenv.config();

// 全局错误处理
process.on('uncaughtException', (error) => {
  console.error('❌ 未捕获的异常:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ 未处理的 Promise 拒绝:', reason);
  console.error('Promise:', promise);
  process.exit(1);
});

const app: Application = express();
const PORT = process.env.PORT || 3000;

// 中间件配置
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态资源服务 (用于访问生成的视频)
// 映射 /api/static/videos 到 RG_data/videos
const RG_DATA_PATH = process.env.LOCAL_STORAGE_PATH 
  ? path.resolve(process.env.LOCAL_STORAGE_PATH) 
  : path.resolve(__dirname, '../../RG_data');

app.use('/api/static', express.static(RG_DATA_PATH));

// API 路由
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api', commonRoutes);  // 通用路由（包含 /api/learning/today-plan）
app.use('/api/learning/session', sessionRoutes);  // V3 Session 学习路由
app.use('/api/books', bookRoutes);
app.use('/api/notebook', notebookRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/checkin', checkinRoutes);
app.use('/api/video', videoRoutes);

// 健康检查路由
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    message: '语境记忆背单词 API 服务正常运行',
    timestamp: new Date().toISOString()
  });
});

// 根路由
app.get('/', (_req: Request, res: Response) => {
  res.json({
    message: '欢迎使用语境记忆背单词 API',
    version: '2.0.0 (V3)',
    endpoints: {
      health: '/health',
      auth: '/api/auth/*',
      user: '/api/user/*',
      learning: '/api/learning/today-plan (today plan only)',
      session: '/api/learning/session/* (V3 three-path learning)',
      books: '/api/books/*',
      notebook: '/api/notebook/*',
      stats: '/api/stats/*',
      checkin: '/api/checkin/*',
      video: '/api/video/*'
    }
  });
});

// 处理未匹配的路由 (404)
app.all('*', (req: Request, _res: Response, next: NextFunction) => {
  next(new AppError(`无法在服务器上找到 ${req.originalUrl}`, 404));
});

// 全局错误处理中间件
app.use(errorHandler);

// 启动服务器
async function startServer() {
  try {
    // 测试数据库连接
    console.log('📦 正在连接数据库...');
    await prisma.$connect();
    console.log('✅ 数据库连接成功');

    // 启动 HTTP 服务器
    const server = app.listen(PORT, () => {
      console.log(`🚀 服务器运行在 http://localhost:${PORT}`);
      console.log(`📚 环境: ${process.env.NODE_ENV || 'development'}`);
      
      // 启动时执行一次视频清理任务 (非阻塞)
      cleanupOldVideos().catch(err => console.error('Startup cleanup failed:', err));
    });

    // 优雅关闭
    process.on('SIGTERM', async () => {
      console.log('📭 收到 SIGTERM 信号，正在关闭服务器...');
      server.close(async () => {
        await prisma.$disconnect();
        console.log('👋 服务器已关闭');
        process.exit(0);
      });
    });

    process.on('SIGINT', async () => {
      console.log('\n📭 收到 SIGINT 信号，正在关闭服务器...');
      server.close(async () => {
        await prisma.$disconnect();
        console.log('👋 服务器已关闭');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('❌ 服务器启动失败:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

// 启动服务器
startServer();

export default app;
