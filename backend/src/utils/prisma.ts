import { PrismaClient } from '@prisma/client';

// 单例模式 + 连接池配置
const prismaClientSingleton = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    // 连接池配置（防止连接耗尽）
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  });
};

// 全局变量确保开发环境下热重载不会创建多个实例
declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}

export default prisma;
