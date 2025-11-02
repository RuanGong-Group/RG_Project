/**
 * 错误日志工具
 * 用于记录关键业务错误，方便后期排查
 */

interface ErrorLogData {
  errorType: string;
  userId?: number;
  operation?: string;
  errorMessage: string;
  errorStack?: string;
  timestamp: string;
  additionalData?: Record<string, any>;
}

/**
 * 记录关键业务错误
 * @param errorType 错误类型（如 'CHECKIN_FAILED', 'DATABASE_ERROR'）
 * @param error 错误对象
 * @param additionalData 附加数据
 */
export function logCriticalError(
  errorType: string,
  error: Error | unknown,
  additionalData?: Record<string, any>
): void {
  const errorLog: ErrorLogData = {
    errorType,
    errorMessage: error instanceof Error ? error.message : String(error),
    errorStack: error instanceof Error ? error.stack : undefined,
    timestamp: new Date().toISOString(),
    ...additionalData
  };

  // 使用醒目的标记输出到控制台
  console.error('╔══════════════════════════════════════════════════════╗');
  console.error('║           🚨 CRITICAL ERROR DETECTED 🚨             ║');
  console.error('╚══════════════════════════════════════════════════════╝');
  console.error('');
  console.error('错误类型:', errorLog.errorType);
  console.error('发生时间:', errorLog.timestamp);
  
  if (errorLog.userId) {
    console.error('用户ID:', errorLog.userId);
  }
  
  if (errorLog.operation) {
    console.error('操作:', errorLog.operation);
  }
  
  console.error('错误信息:', errorLog.errorMessage);
  
  if (errorLog.additionalData) {
    console.error('附加信息:', JSON.stringify(errorLog.additionalData, null, 2));
  }
  
  if (errorLog.errorStack) {
    console.error('');
    console.error('堆栈跟踪:');
    console.error(errorLog.errorStack);
  }
  
  console.error('');
  console.error('════════════════════════════════════════════════════════');
  console.error('');

  // TODO: 未来改进
  // 1. 写入到错误日志文件
  // 2. 发送到日志收集系统（如ELK）
  // 3. 触发告警通知
  // 4. 记录到数据库的错误日志表
}

/**
 * 记录警告信息
 * @param warningType 警告类型
 * @param message 警告消息
 * @param data 相关数据
 */
export function logWarning(
  warningType: string,
  message: string,
  data?: Record<string, any>
): void {
  console.warn('⚠️  [WARNING]', warningType);
  console.warn('   消息:', message);
  console.warn('   时间:', new Date().toISOString());
  
  if (data) {
    console.warn('   数据:', JSON.stringify(data, null, 2));
  }
  
  console.warn('');
}

/**
 * 记录信息日志
 * @param category 类别
 * @param message 消息
 * @param data 相关数据
 */
export function logInfo(
  category: string,
  message: string,
  data?: Record<string, any>
): void {
  if (process.env.NODE_ENV === 'development') {
    console.log('ℹ️  [INFO]', category, '-', message);
    if (data) {
      console.log('   数据:', JSON.stringify(data, null, 2));
    }
  }
}
