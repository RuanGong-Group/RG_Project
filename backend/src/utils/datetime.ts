/**
 * 日期时间工具函数
 * 统一处理时区问题，确保所有时间都使用北京时间（UTC+8）
 * 
 * 重要说明：
 * - MySQL的DATETIME字段存储的是不带时区的本地时间
 * - 我们的数据库设计约定：所有DATETIME字段都存储北京时间
 * - 因此，我们需要将Date对象转换为"UTC时间戳表示的北京日期"
 * 
 * 例如：北京时间 2025-10-28 00:00:00 应该存储为 2025-10-28T00:00:00.000Z
 */

/**
 * 获取当前北京时间对应的UTC Date对象
 * 
 * 说明:返回的Date对象,其UTC时间值等于北京当前时间
 * 例如:北京时间 2025-10-28 15:30:00 返回 2025-10-28T15:30:00.000Z
 * 
 * @returns Date 对象(UTC表示的北京时间)
 * 
 * 修复说明(2025-11-30): 
 * - 服务器运行在中国时区(GMT+0800),new Date()已经是北京时间
 * - 不需要再加8小时偏移,否则会导致时间多算8小时
 */
export function getBeijingTime(): Date {
  // 直接返回当前时间(服务器在中国时区)
  return new Date();
}

/**
 * 获取今天零点(北京时间)
 * 
 * 说明:返回北京时间今天00:00:00对应的Date对象
 * 例如:北京 2025-10-28 返回 2025-10-28 00:00:00
 * 
 * 修复说明(2025-12-01):
 * - 使用setUTCHours确保在UTC时区设置零点,避免时区转换问题
 * - 这样数据库中存储的日期才能正确匹配
 * 
 * @returns Date 对象(当天00:00:00,UTC表示)
 */
export function getBeijingToday(): Date {
  const today = new Date(); // 服务器在中国时区,直接使用本地时间
  today.setUTCHours(0, 0, 0, 0); // 使用UTC时区设置零点
  return today;
}

/**
 * 获取昨天零点(北京时间)
 * @returns Date 对象(昨天00:00:00)
 */
export function getBeijingYesterday(): Date {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setUTCHours(0, 0, 0, 0); // 使用UTC时区设置零点
  return yesterday;
}

/**
 * 获取指定天数前的日期零点(北京时间)
 * @param days 天数
 * @returns Date 对象
 */
export function getBeijingDaysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setUTCHours(0, 0, 0, 0); // 使用UTC时区设置零点
  return date;
}

/**
 * 安全解析 JSON 字符串
 * @param jsonString JSON 字符串
 * @param defaultValue 解析失败时的默认值
 * @returns 解析后的对象或默认值
 */
export function safeJsonParse<T>(jsonString: string | null | undefined, defaultValue: T): T {
  if (!jsonString) {
    return defaultValue;
  }

  try {
    return JSON.parse(jsonString) as T;
  } catch (error) {
    console.error('JSON 解析失败:', error, '原始数据:', jsonString);
    return defaultValue;
  }
}

/**
 * 格式化日期为北京时间字符串
 * @param date Date 对象
 * @returns 格式化的字符串（YYYY-MM-DD HH:mm:ss）
 */
export function formatBeijingTime(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * 计算下次复习时间(固定在指定小时)
 * 
 * @param intervalDays - 间隔天数
 * @param reviewHour - 复习时间(北京时间小时数,默认8点)
 * @returns Date 对象(interval天后的指定时间)
 * 
 * 设计理念:
 * - 统一所有复习到固定时间点(如早上8点),提升用户体验
 * - 避免"晚上11点学习 → 次日晚上11点复习"的不合理情况
 */
export function calculateNextReviewTime(intervalDays: number, reviewHour: number = 8): Date {
  const nextReview = new Date();
  nextReview.setUTCHours(reviewHour - 8, 0, 0, 0); // 北京时间8点 = UTC 0点
  nextReview.setDate(nextReview.getDate() + intervalDays);
  return nextReview;
}

/**
 * 计算两个日期之间的天数差(忽略时间部分)
 * @param date1 第一个日期
 * @param date2 第二个日期
 * @returns 天数差(正数表示 date2 在 date1 之后)
 */
export function getDaysDifference(date1: Date, date2: Date): number {
  const d1 = new Date(date1);
  d1.setHours(0, 0, 0, 0);
  
  const d2 = new Date(date2);
  d2.setHours(0, 0, 0, 0);
  
  const diffTime = d2.getTime() - d1.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}
