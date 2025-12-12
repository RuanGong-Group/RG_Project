import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { bookApi } from '../services/api';

interface WordItem {
  wordId: number;
  word: string;
  lemma: string;
  pronunciations: any;
  meanings: Array<{
    meaningId: number;
    partOfSpeech: string;
    definition: string;
    progress?: {
      masteryLevel: number;
      nextReviewAt: string;
    } | null;
  }>;
  isLearned?: boolean;
  isDue?: boolean;
}

interface BookData {
  bookId: number;
  bookName: string;
  salt: string;
  words: WordItem[];
  total: number;
}

export default function BookDetail() {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [bookData, setBookData] = useState<BookData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showReshuffleModal, setShowReshuffleModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (bookId) {
      loadBookData();
    }
  }, [bookId]);

  const loadBookData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await bookApi.getBookWords(parseInt(bookId!), 100, true);
      
      // 标记已学习和待复习的单词
      const wordsWithStatus = data.words.map(word => ({
        ...word,
        isLearned: word.meanings.some(m => m.progress),
        isDue: word.meanings.some(m => 
          m.progress && new Date(m.progress.nextReviewAt) <= new Date()
        )
      }));
      
      setBookData({
        ...data,
        words: wordsWithStatus
      });
    } catch (err: any) {
      setError(err.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  const handleReshuffle = async () => {
    try {
      setLoading(true);
      await bookApi.reshuffleBook(parseInt(bookId!));
      setShowReshuffleModal(false);
      
      // 重新加载数据
      await loadBookData();
      
      // 显示成功提示
      alert('✅ 重新乱序成功！单词顺序已更新');
    } catch (err: any) {
      alert('❌ 重新乱序失败: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStartLearning = () => {
    navigate('/session-learn', { state: { mode: 'new-only' } });
  };

  // 过滤搜索
  const filteredWords = bookData?.words.filter(word =>
    word.word.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // 统计数据（注意：这里统计的是当前加载的单词，不是全局统计）
  const stats = bookData ? {
    total: bookData.words.length,  // 修复：使用已加载的单词数量，而不是整个词书的总数
    learned: bookData.words.filter(w => w.isLearned).length,
    due: bookData.words.filter(w => w.isDue).length,
    new: bookData.words.filter(w => !w.isLearned).length
  } : null;

  if (loading && !bookData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">❌ {error}</p>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            返回
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* 头部 */}
      <div className="bg-white shadow">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate(-1)}
                className="text-gray-600 hover:text-gray-900"
              >
                ← 返回
              </button>
              <h1 className="text-2xl font-bold">📚 {bookData?.bookName}</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 mt-6 space-y-6">
        {/* 学习统计 */}
        {stats && bookData && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">📊 当前页面统计 (已加载 {stats.total} 个单词)</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-3xl font-bold text-blue-600">{bookData.total}</div>
                <div className="text-sm text-gray-600 mt-1">词书总数</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-3xl font-bold text-green-600">{stats.learned}</div>
                <div className="text-sm text-gray-600 mt-1">已学习</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-3xl font-bold text-orange-600">{stats.due}</div>
                <div className="text-sm text-gray-600 mt-1">待复习</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-3xl font-bold text-gray-600">{stats.new}</div>
                <div className="text-sm text-gray-600 mt-1">未学习</div>
              </div>
            </div>
            
            {/* 进度条 - 使用词书总数计算 */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-gray-600">词书总进度</span>
                <span className="font-semibold">
                  {stats.learned}/{bookData.total} ({Math.round(stats.learned / bookData.total * 100)}%)
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-green-500 h-3 rounded-full transition-all"
                  style={{ width: `${Math.min(100, stats.learned / bookData.total * 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
        )}

        {/* 词书管理 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">🔧 词书管理</h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setShowReshuffleModal(true)}
              disabled={loading}
              className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 flex items-center space-x-2"
            >
              <span>🔀</span>
              <span>重新乱序</span>
            </button>
            <button
              onClick={handleStartLearning}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center space-x-2"
            >
              <span>📖</span>
              <span>开始学习</span>
            </button>
          </div>
          
          <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
            💡 提示: 单词顺序已使用智能乱序，保证每次打开顺序一致
          </div>
        </div>

        {/* 单词列表 */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">📖 单词列表 (当前学习顺序)</h2>
            <input
              type="text"
              placeholder="搜索单词..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="space-y-2">
            {filteredWords.map((word, index) => (
              <div
                key={word.wordId}
                className={`p-4 rounded-lg border-2 transition-all ${
                  word.isLearned
                    ? word.isDue
                      ? 'bg-orange-50 border-orange-200'
                      : 'bg-green-50 border-green-200'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <span className="text-gray-500 font-mono w-8">{index + 1}.</span>
                    <div>
                      <div className="font-semibold text-lg">{word.word}</div>
                      <div className="text-sm text-gray-600">
                        {word.meanings.length} 个词义
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {word.isLearned ? (
                      word.isDue ? (
                        <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm">
                          待复习
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                          已掌握
                        </span>
                      )
                    ) : (
                      <span className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-sm">
                        未学习
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredWords.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              {searchQuery ? '没有找到匹配的单词' : '词书为空'}
            </div>
          )}
        </div>
      </div>

      {/* 重新乱序确认弹窗 */}
      {showReshuffleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-xl font-bold mb-4">🔀 确认重新乱序</h3>
            <div className="space-y-3 text-gray-700 mb-6">
              <p className="flex items-start">
                <span className="mr-2">⚠️</span>
                <span>重新乱序后:</span>
              </p>
              <ul className="ml-6 space-y-2">
                <li>• 未学习的单词顺序会重新打乱</li>
                <li>• 已学习的单词不受影响</li>
                <li>• 下次打开将看到新的学习顺序</li>
              </ul>
              <p className="text-sm text-gray-600">是否继续?</p>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowReshuffleModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleReshuffle}
                disabled={loading}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
              >
                {loading ? '处理中...' : '确认重新乱序'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
