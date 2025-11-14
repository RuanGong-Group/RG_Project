import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { statsApi } from '../services/api';
import type { StatsOverview } from '../types/api';

export default function Stats() {
  const navigate = useNavigate();
  
  // 状态管理
  const [overview, setOverview] = useState<StatsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 加载统计数据
  useEffect(() => {
    loadStatsData();
  }, []);

  const loadStatsData = async () => {
    try {
      setLoading(true);
      setError(null);

      const overviewData = await statsApi.getOverview();
      setOverview(overviewData);
    } catch (err: any) {
      console.error('加载统计数据失败:', err);
      setError(err.response?.data?.message || err.message || '加载统计数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 返回按钮
  const handleBack = () => {
    navigate('/today-plan');
  };

  // 加载中
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">加载统计数据中...</p>
        </div>
      </div>
    );
  }

  // 错误状态
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">加载失败</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={loadStatsData}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  // 空数据状态 - 必须在使用 overview 之前检查
  if (!overview || !overview.masteryDistribution) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">📊</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">还没有学习数据</h2>
          <p className="text-gray-600 mb-6">开始学习吧，积累学习数据后可以在这里查看统计信息！</p>
          <button
            onClick={handleBack}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
          >
            返回学习计划
          </button>
        </div>
      </div>
    );
  }

  // 掌握程度标签和颜色
  const masteryLevels = [
    { key: 'level0', label: '刚学', color: 'bg-gray-400', desc: '5分钟内' },
    { key: 'level1', label: '较弱', color: 'bg-red-400', desc: '30分钟内' },
    { key: 'level2', label: '一般', color: 'bg-orange-400', desc: '12小时内' },
    { key: 'level3', label: '良好', color: 'bg-yellow-400', desc: '1天内' },
    { key: 'level4', label: '熟练', color: 'bg-blue-400', desc: '2天内' },
    { key: 'level5', label: '精通', color: 'bg-green-400', desc: '7天内' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* 顶部导航 */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={handleBack}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <span className="mr-2">←</span>
            返回
          </button>
          <h1 className="text-2xl font-bold text-gray-900">📊 学习统计</h1>
          <div className="w-16"></div> {/* 占位符保持标题居中 */}
        </div>

        {/* 学习概览卡片 */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">📚 学习概览</h2>
          
          {/* 今日学习数据 */}
          {overview.today && (
            <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-lg p-4 mb-6">
              <div className="text-sm text-gray-600 mb-2">📅 今日学习</div>
              <div className="flex items-center justify-around">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{overview.today.learned}</div>
                  <div className="text-xs text-gray-600">新学单词</div>
                </div>
                <div className="text-gray-300 text-2xl">+</div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{overview.today.reviewed}</div>
                  <div className="text-xs text-gray-600">复习单词</div>
                </div>
                <div className="text-gray-300 text-2xl">=</div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{overview.today.total}</div>
                  <div className="text-xs text-gray-600">总计</div>
                </div>
              </div>
            </div>
          )}
          
          {/* 总体进度 */}
          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>学习进度</span>
              <span className="font-semibold text-gray-900">
                {overview.learnedWords} / {overview.totalWords} 
                {overview.progressPercentage !== undefined && (
                  <span className="text-blue-600 ml-2">({overview.progressPercentage}%)</span>
                )}
              </span>
            </div>
            <div className="bg-gray-200 rounded-full h-4 overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-500 to-green-500 h-full transition-all duration-500 flex items-center justify-center"
                style={{ width: `${overview.progressPercentage || 0}%` }}
              >
                {(overview.progressPercentage || 0) > 10 && (
                  <span className="text-xs font-semibold text-white">
                    {overview.progressPercentage}%
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 单词数据卡片 */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-blue-600">{overview.totalWords}</div>
              <div className="text-sm text-gray-600 mt-1">词书总单词</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-green-600">{overview.learnedWords}</div>
              <div className="text-sm text-gray-600 mt-1">已学单词</div>
            </div>
          </div>

          {/* 掌握程度分布 */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">掌握程度分布</h3>
            <div className="space-y-2">
              {masteryLevels.map(level => {
                const count = overview.masteryDistribution[level.key as keyof typeof overview.masteryDistribution] || 0;
                const percentage = overview.learnedWords > 0 
                  ? Math.round((count / overview.learnedWords) * 100) 
                  : 0;
                
                return (
                  <div key={level.key} className="flex items-center">
                    <div className="w-20 text-sm text-gray-700">
                      {level.label}
                      <span className="text-xs text-gray-500 ml-1">({level.desc})</span>
                    </div>
                    <div className="flex-1 mx-3">
                      <div className="bg-gray-200 rounded-full h-6 relative overflow-hidden">
                        <div
                          className={`${level.color} h-full transition-all duration-500 flex items-center justify-end pr-2`}
                          style={{ width: `${percentage}%` }}
                        >
                          {count > 0 && (
                            <span className="text-xs font-semibold text-white">
                              {count}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="w-12 text-right text-sm font-semibold text-gray-700">
                      {percentage}%
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
