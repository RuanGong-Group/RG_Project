/**
 * 成就系统配置
 * 定义所有可获得的成就及其解锁条件
 */

export interface AchievementDefinition {
  key: string;           // 唯一标识（数据库存储用）
  name: string;          // 显示名称
  description: string;   // 描述
  icon: string;          // Emoji 图标
  category: 'checkin' | 'learning';  // 分类
  priority: number;      // 优先级（日历显示时用，数字越小优先级越高）
}

/**
 * 成就定义列表（10个核心成就）
 */
export const ACHIEVEMENTS: Record<string, AchievementDefinition> = {
  // 📅 打卡类成就（5个）
  FIRST_CHECKIN: {
    key: 'first_checkin',
    name: '初次打卡',
    description: '完成第一次每日打卡',
    icon: '🎯',
    category: 'checkin',
    priority: 5
  },
  
  STREAK_7_DAYS: {
    key: 'streak_7_days',
    name: '连续7天',
    description: '连续打卡7天',
    icon: '🔥',
    category: 'checkin',
    priority: 3
  },
  
  STREAK_30_DAYS: {
    key: 'streak_30_days',
    name: '连续30天',
    description: '连续打卡30天',
    icon: '💪',
    category: 'checkin',
    priority: 2
  },
  
  TOTAL_100_DAYS: {
    key: 'total_100_days',
    name: '百日坚持',
    description: '累计打卡100天',
    icon: '🏆',
    category: 'checkin',
    priority: 1
  },
  
  DAILY_GOAL_COMPLETE: {
    key: 'daily_goal_complete',
    name: '目标达成',
    description: '完成单日学习目标',
    icon: '⚡',
    category: 'checkin',
    priority: 6
  },

  // 📚 学习类成就（5个）
  FIRST_WORD: {
    key: 'first_word',
    name: '初学者',
    description: '学习第一个单词',
    icon: '🌱',
    category: 'learning',
    priority: 7
  },
  
  LEARN_100_WORDS: {
    key: 'learn_100_words',
    name: '百词斩',
    description: '累计学习100个单词',
    icon: '📖',
    category: 'learning',
    priority: 4
  },
  
  LEARN_1000_WORDS: {
    key: 'learn_1000_words',
    name: '千词王',
    description: '累计学习1000个单词',
    icon: '🎓',
    category: 'learning',
    priority: 1
  },
  
  REVIEW_500_WORDS: {
    key: 'review_500_words',
    name: '复习达人',
    description: '累计复习500个单词',
    icon: '🔁',
    category: 'learning',
    priority: 4
  },
  
  PERFECT_SESSION: {
    key: 'perfect_session',
    name: '完美学习',
    description: '单次学习会话准确率100%',
    icon: '💯',
    category: 'learning',
    priority: 6
  }
};

/**
 * 获取所有成就列表
 */
export function getAllAchievements(): AchievementDefinition[] {
  return Object.values(ACHIEVEMENTS);
}

/**
 * 根据 key 获取成就定义
 */
export function getAchievementByKey(key: string): AchievementDefinition | undefined {
  return ACHIEVEMENTS[Object.keys(ACHIEVEMENTS).find(k => ACHIEVEMENTS[k].key === key) || ''];
}

/**
 * 获取特定类别的成就
 */
export function getAchievementsByCategory(category: 'checkin' | 'learning'): AchievementDefinition[] {
  return getAllAchievements().filter(a => a.category === category);
}
