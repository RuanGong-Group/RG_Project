import prisma from '../utils/prisma';

export class UserService {
  /**
   * 获取用户的每日学习目标
   */
  async getDailyGoal(userId: number) {
    // 查询用户的每日目标
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        dailyLearningGoal: true
      }
    });

    if (!user) {
      throw new Error('用户不存在');
    }

    return {
      userId: user.id,
      username: user.username,
      dailyGoal: user.dailyLearningGoal
    };
  }

  /**
   * 更新用户的每日学习目标
   */
  async updateDailyGoal(userId: number, dailyGoal: number) {
    // 验证范围
    if (dailyGoal < 1 || dailyGoal > 300) {
      throw new Error('每日目标必须在1-300之间');
    }

    // 更新用户的每日目标
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        dailyLearningGoal: dailyGoal
      },
      select: {
        id: true,
        username: true,
        dailyLearningGoal: true
      }
    });

    return {
      userId: updatedUser.id,
      username: updatedUser.username,
      dailyGoal: updatedUser.dailyLearningGoal
    };
  }
}

export const userService = new UserService();
