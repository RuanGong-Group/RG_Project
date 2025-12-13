import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

// Use environment variable or relative path for API base URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

interface Book {
  id: number;
  tagName: string;
  wordCount: number;
  isUserDefined: boolean;
}

interface Achievement {
  key: string;
  name: string;
  description: string;
  icon: string;
  category: 'checkin' | 'learning';
  priority: number;
  unlocked: boolean;
  unlockedAt: string | null;
}

export default function Settings() {
  const navigate = useNavigate();
  
  const [username, setUsername] = useState('');
  const [dailyGoal, setDailyGoal] = useState(10);
  const [currentBook, setCurrentBook] = useState<Book | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedBookId, setSelectedBookId] = useState<number>(0);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [achievementStats, setAchievementStats] = useState({ total: 0, unlocked: 0, progress: 0 });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 获取token
  const getToken = () => localStorage.getItem('jm_token');

  // 加载数据
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = getToken();
      if (!token) {
        navigate('/login');
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };

      // 并行请求所有数据（增加成就数据）
      const [goalRes, bookRes, booksRes, achievementsRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/user/settings/daily-goal`, { headers }),
        axios.get(`${API_BASE_URL}/user/current-book`, { headers }),
        axios.get(`${API_BASE_URL}/books`, { headers }),
        axios.get(`${API_BASE_URL}/achievements`, { headers }).catch(() => ({ data: { success: false } })) // 容错处理
      ]);

      // 设置用户名和每日目标
      if (goalRes.data.success) {
        setUsername(goalRes.data.data.username);
        setDailyGoal(goalRes.data.data.dailyGoal);
      }

      // 设置当前词书
      if (bookRes.data.success && bookRes.data.data) {
        setCurrentBook(bookRes.data.data);
        setSelectedBookId(bookRes.data.data.id);
      }

      // 设置词书列表
      if (booksRes.data.success) {
        setBooks(booksRes.data.data);
      }

      // 设置成就数据
      if (achievementsRes.data.success) {
        setAchievements(achievementsRes.data.data.achievements || []);
        setAchievementStats(achievementsRes.data.data.stats || { total: 0, unlocked: 0, progress: 0 });
      }

    } catch (err: any) {
      console.error('加载设置失败:', err);
      setError(err.response?.data?.message || '加载设置失败');
    } finally {
      setLoading(false);
    }
  };

  // 保存每日目标
  const handleSaveDailyGoal = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      const token = getToken();
      if (!token) {
        navigate('/login');
        return;
      }

      await axios.put(
        `${API_BASE_URL}/user/settings/daily-goal`,
        { dailyGoal },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccessMessage('每日目标已更新！');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('更新每日目标失败:', err);
      setError(err.response?.data?.message || '更新失败');
    } finally {
      setSaving(false);
    }
  };

  // 切换词书
  const handleSwitchBook = async () => {
    if (selectedBookId === currentBook?.id) {
      return; // 没有变化
    }

    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      const token = getToken();
      if (!token) {
        navigate('/login');
        return;
      }

      await axios.put(
        `${API_BASE_URL}/user/current-book`,
        { bookTagId: selectedBookId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // 更新当前词书
      const newBook = books.find(b => b.id === selectedBookId);
      if (newBook) {
        setCurrentBook(newBook);
      }

      setSuccessMessage('词书已切换！');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('切换词书失败:', err);
      setError(err.response?.data?.message || '切换失败');
    } finally {
      setSaving(false);
    }
  };

  // 返回
  const handleBack = () => {
    navigate('/today-plan');
  };

  // 加载中
  if (loading) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">加载设置中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-amber-50 p-4">
      <div className="max-w-2xl mx-auto">
        {/* 顶部导航 */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={handleBack}
            className="flex items-center text-amber-700 hover:text-amber-900"
          >
            <span className="mr-2">←</span>
            返回
          </button>
          <h1 className="text-2xl font-bold text-amber-900">⚙️ 用户设置</h1>
          <div className="w-16"></div>
        </div>

        {/* 成功提示 */}
        {successMessage && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            {successMessage}
          </div>
        )}

        {/* 错误提示 */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* 个人信息卡片 */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">👤 个人信息</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">用户名：</span>
              <span className="font-medium text-gray-900">{username}</span>
            </div>
          </div>
        </div>

        {/* 学习设置卡片 */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">📚 学习设置</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                每日学习目标（单词数）
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="number"
                  min="1"
                  max="300"
                  value={dailyGoal}
                  onChange={(e) => setDailyGoal(parseInt(e.target.value) || 10)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={handleSaveDailyGoal}
                  disabled={saving}
                  className="px-6 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
                >
                  {saving ? '保存中...' : '保存'}
                </button>
              </div>
              <p className="mt-2 text-sm text-gray-500">
                建议：初学者 5-10个，备考期 15-30个，冲刺期 30-50个，学霸模式 100+个
              </p>
            </div>
          </div>
        </div>

        {/* 词书设置卡片 */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">📚 词书管理</h2>
          
          {currentBook && (
            <div className="mb-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-medium text-gray-900">{currentBook.tagName}</div>
                  <div className="text-sm text-gray-600">共 {currentBook.wordCount} 个单词</div>
                </div>
                <button
                  onClick={() => navigate(`/books/${currentBook.id}`)}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  查看详情 →
                </button>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                切换词书
              </label>
              <div className="flex items-center gap-4">
                <select
                  value={selectedBookId}
                  onChange={(e) => setSelectedBookId(parseInt(e.target.value))}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {books.map(book => (
                    <option key={book.id} value={book.id}>
                      {book.tagName} ({book.wordCount}词)
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleSwitchBook}
                  disabled={saving || selectedBookId === currentBook?.id}
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
                >
                  {saving ? '切换中...' : '切换'}
                </button>
              </div>
              {books.length === 0 && (
                <p className="mt-2 text-sm text-gray-500">
                  暂无可用词书，请先导入词书数据
                </p>
              )}
            </div>
          </div>
        </div>

        {/* 成就墙卡片 */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">🏆 我的成就</h2>
          
          {/* 进度条 */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">
                已解锁 {achievementStats.unlocked} / {achievementStats.total}
              </span>
              <span className="text-sm font-bold text-amber-600">
                {achievementStats.progress}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-amber-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${achievementStats.progress}%` }}
              ></div>
            </div>
          </div>

          {/* 成就列表 */}
          {achievements.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              开始学习以解锁成就！
            </div>
          ) : (
            <div className="space-y-3">
              {/* 打卡类成就 */}
              <div>
                <h3 className="text-sm font-bold text-gray-700 mb-2">📅 打卡成就</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {achievements.filter(a => a.category === 'checkin').map(achievement => (
                    <div
                      key={achievement.key}
                      className={`
                        p-3 rounded-lg border-2 transition-all
                        ${achievement.unlocked 
                          ? 'bg-amber-50 border-amber-300 hover:shadow-md' 
                          : 'bg-gray-50 border-gray-200 opacity-50'
                        }
                      `}
                      title={achievement.description}
                    >
                      <div className="text-3xl mb-1 text-center">{achievement.icon}</div>
                      <div className="text-sm font-medium text-gray-900 text-center">
                        {achievement.name}
                      </div>
                      {achievement.unlocked && achievement.unlockedAt && (
                        <div className="text-xs text-gray-500 text-center mt-1">
                          {new Date(achievement.unlockedAt).toLocaleDateString('zh-CN')}
                        </div>
                      )}
                      {!achievement.unlocked && (
                        <div className="text-xs text-gray-400 text-center mt-1">
                          未解锁
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* 学习类成就 */}
              <div>
                <h3 className="text-sm font-bold text-gray-700 mb-2">📚 学习成就</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {achievements.filter(a => a.category === 'learning').map(achievement => (
                    <div
                      key={achievement.key}
                      className={`
                        p-3 rounded-lg border-2 transition-all
                        ${achievement.unlocked 
                          ? 'bg-blue-50 border-blue-300 hover:shadow-md' 
                          : 'bg-gray-50 border-gray-200 opacity-50'
                        }
                      `}
                      title={achievement.description}
                    >
                      <div className="text-3xl mb-1 text-center">{achievement.icon}</div>
                      <div className="text-sm font-medium text-gray-900 text-center">
                        {achievement.name}
                      </div>
                      {achievement.unlocked && achievement.unlockedAt && (
                        <div className="text-xs text-gray-500 text-center mt-1">
                          {new Date(achievement.unlockedAt).toLocaleDateString('zh-CN')}
                        </div>
                      )}
                      {!achievement.unlocked && (
                        <div className="text-xs text-gray-400 text-center mt-1">
                          未解锁
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
