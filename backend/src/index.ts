import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import learningRoutes from './routes/learning.routes';
import bookRoutes from './routes/book.routes';
import notebookRoutes from './routes/notebook.routes';
import statsRoutes from './routes/stats.routes';
import checkinRoutes from './routes/checkin.routes';
import prisma from './utils/prisma';

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

// API 路由
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/learning', learningRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/notebook', notebookRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/checkin', checkinRoutes);

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
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: '/api/auth/*',
      user: '/api/user/*',
      learning: '/api/learning/*',
      books: '/api/books/*',
      notebook: '/api/notebook/*',
      stats: '/api/stats/*',
      checkin: '/api/checkin/*'
    }
  });
});

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
