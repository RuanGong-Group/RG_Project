/**
 * 今日学习计划页面
 * 测试点2：显示每日目标、进度、待复习内容、新学习配额
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { bookApi, learningApi } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import type { Book, TodayPlanResponse } from '../types/api';

export default function TodayPlan() {
  const navigate = useNavigate();
  const { logout } = useAuthStore();
  const [currentBook, setCurrentBook] = useState<Book | null>(null);
  const [allBooks, setAllBooks] = useState<Book[]>([]);
  const [plan, setPlan] = useState<TodayPlanResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showBookSelector, setShowBookSelector] = useState(false);

  // 退出登录
  const handleLogout = () => {
    if (confirm('确定要退出登录吗？')) {
      logout();
      navigate('/login');
    }
  };

  // 加载数据
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. 获取当前词书
      const book = await bookApi.getCurrentBook();
      setCurrentBook(book);

      // 2. 如果没有选择词书，获取所有词书供选择
      if (!book) {
        const books = await bookApi.getAllBooks();
        setAllBooks(books);
        setShowBookSelector(true);
      } else {
        // 3. 有词书，获取今日计划
        const todayPlan = await learningApi.getTodayPlan();
        setPlan(todayPlan);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  };

  // 切换词书
  const handleSelectBook = async (bookId: number) => {
    try {
      const book = await bookApi.updateCurrentBook({ bookId });
      setCurrentBook(book);
      setShowBookSelector(false);
      // 重新加载计划
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '切换词书失败');
    }
  };

  // 加载中
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f5f5f5'
      }}>
        <div style={{ fontSize: '18px', color: '#8c8c8c' }}>
          加载中...
        </div>
      </div>
    );
  }

  // 错误状态
  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f5f5f5'
      }}>
        <div style={{
          padding: '32px',
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <div style={{ color: '#ff4d4f', marginBottom: '16px', fontSize: '16px' }}>
            {error}
          </div>
          <button
            onClick={loadData}
            style={{
              padding: '8px 24px',
              backgroundColor: '#1890ff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  // 选择词书界面
  if (showBookSelector) {
    return (
      <div style={{
        minHeight: '100vh',
        padding: '24px',
        backgroundColor: '#f5f5f5'
      }}>
        <div style={{
          maxWidth: '600px',
          margin: '0 auto',
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ marginBottom: '16px', fontSize: '20px' }}>
            请选择要学习的词书
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {allBooks.map((book) => (
              <div
                key={book.id}
                onClick={() => handleSelectBook(book.id)}
                style={{
                  padding: '16px',
                  border: '1px solid #d9d9d9',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  transition: 'all 0.3s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#1890ff';
                  e.currentTarget.style.backgroundColor = '#f0f8ff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#d9d9d9';
                  e.currentTarget.style.backgroundColor = 'white';
                }}
              >
                <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '4px' }}>
                  {book.tagName}
                </div>
                <div style={{ fontSize: '14px', color: '#8c8c8c' }}>
                  共 {book.wordCount} 个单词
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 显示今日计划
  if (!plan || !plan.progress) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f5f5' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ display: 'inline-block', width: '48px', height: '48px', border: '4px solid #f3f3f3', borderTop: '4px solid #1890ff', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '16px' }}></div>
          <p style={{ color: '#666' }}>加载学习计划中...</p>
        </div>
      </div>
    );
  }

  // 计算总完成数和进度百分比
  const totalCompleted = plan.progress.total; // 使用 total（新学 + 复习）
  const progressPercent = plan.dailyGoal > 0
    ? Math.round((totalCompleted / plan.dailyGoal) * 100)
    : 0;

  return (
    <div style={{
      minHeight: '100vh',
      padding: '24px',
      backgroundColor: '#f5f5f5'
    }}>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto'
      }}>
        {/* 头部 */}
        <div style={{
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>
            今日学习计划
          </h1>
          <button
            onClick={handleLogout}
            style={{
              padding: '8px 16px',
              backgroundColor: '#ff4d4f',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            退出登录
          </button>
        </div>

        {/* 当前词书 */}
        {currentBook && (
          <div style={{
            marginBottom: '16px',
            padding: '12px',
            backgroundColor: '#e6f7ff',
            border: '1px solid #91d5ff',
            borderRadius: '4px',
            fontSize: '14px'
          }}>
            当前词书：<strong>{currentBook.tagName}</strong> （共 {currentBook.wordCount} 个单词）
          </div>
        )}

        {/* 每日目标卡片 */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '24px',
          marginBottom: '16px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>
            📊 每日目标
          </h2>
          <div style={{ marginBottom: '16px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '8px',
              fontSize: '14px'
            }}>
              <span>已完成 {totalCompleted} / {plan.dailyGoal} 个单词</span>
              <span>{progressPercent}%</span>
            </div>
            <div style={{
              height: '8px',
              backgroundColor: '#f0f0f0',
              borderRadius: '4px',
              overflow: 'hidden'
            }}>
            <div style={{
              width: `${Math.min(progressPercent, 100)}%`,
              height: '100%',
              backgroundColor: progressPercent >= 100 ? '#52c41a' : '#1890ff',
              transition: 'width 0.3s'
            }} />
          </div>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px',
            fontSize: '14px'
          }}>
            <div>
              <span style={{ color: '#8c8c8c' }}>今日新学：</span>
              <strong style={{ marginLeft: '8px', color: '#1890ff' }}>{plan.progress.learned}</strong>
            </div>
            <div>
              <span style={{ color: '#8c8c8c' }}>今日复习：</span>
              <strong style={{ marginLeft: '8px', color: '#52c41a' }}>{plan.progress.reviewed}</strong>
            </div>
            <div>
              <span style={{ color: '#8c8c8c' }}>总计：</span>
              <strong style={{ marginLeft: '8px', color: '#722ed1' }}>{totalCompleted}</strong>
            </div>
          </div>
        </div>        {/* 待复习卡片 */}
        {plan.review.dueCount > 0 && (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '24px',
            marginBottom: '16px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>
              🔄 待复习（{plan.review.dueCount} 个单词）
            </h2>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              maxHeight: '200px',
              overflowY: 'auto'
            }}>
              {plan.review.words.slice(0, 10).map((word) => (
                <div
                  key={word.wordId}
                  style={{
                    padding: '12px',
                    backgroundColor: '#fafafa',
                    borderRadius: '4px',
                    display: 'flex',
                    justifyContent: 'space-between'
                  }}
                >
                  <span style={{ fontWeight: '500' }}>{word.word}</span>
                  <span style={{ fontSize: '12px', color: '#8c8c8c' }}>
                    {word.dueMeanings}/{word.totalMeanings} 个词义待复习
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 待学新词 */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '24px',
          marginBottom: '16px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>
            📖 待学新词（配额：{plan.newLearning.quota} 个 | 可学：{plan.newLearning.available} 个）
          </h2>
          {plan.newLearning.available > 0 && plan.newLearning.quota > 0 ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              maxHeight: '200px',
              overflowY: 'auto'
            }}>
              {plan.newLearning.words.slice(0, 5).map((word) => (
                <div
                  key={word.wordId}
                  style={{
                    padding: '12px',
                    backgroundColor: '#f6ffed',
                    borderRadius: '4px',
                    display: 'flex',
                    justifyContent: 'space-between'
                  }}
                >
                  <span style={{ fontWeight: '500' }}>{word.word}</span>
                  <span style={{ fontSize: '12px', color: '#8c8c8c' }}>
                    {word.totalMeanings} 个词义
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: '#8c8c8c', textAlign: 'center', padding: '16px' }}>
              {plan.newLearning.available === 0 
                ? '📚 该词书所有单词已学完！' 
                : plan.newLearning.quota <= 0
                ? '⏰ 今日配额已用完，明天继续加油！'
                : '✅ 今日学习已完成'}
            </div>
          )}
        </div>

        {/* 学习按钮组 */}
        <div style={{ display: 'flex', gap: '12px' }}>
          {/* 复习按钮：有待复习任务时显示，或今天已复习过单词时也显示 */}
          {(plan.review.dueCount > 0 || plan.progress.reviewed > 0) && (
            <button
              style={{
                flex: 1,
                padding: '16px',
                backgroundColor: plan.review.dueCount > 0 ? '#ff9800' : '#4caf50',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '500',
                cursor: plan.review.dueCount > 0 ? 'pointer' : 'not-allowed',
                opacity: plan.review.dueCount > 0 ? 1 : 0.7
              }}
              onClick={() => plan.review.dueCount > 0 && navigate('/review')}
              disabled={plan.review.dueCount === 0}
            >
              {plan.review.dueCount > 0 
                ? `🔄 开始复习 (${plan.review.dueCount})` 
                : '✅ 今日复习已完成'}
            </button>
          )}
          
          {/* 学习按钮 */}
          <button
            style={{
              flex: 1,
              padding: '16px',
              backgroundColor: '#1890ff',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '500',
              cursor: 'pointer',
              opacity: plan.newLearning.available === 0 ? 0.5 : 1
            }}
            onClick={() => navigate('/learn')}
            disabled={plan.newLearning.available === 0}
          >
            📖 开始学习
          </button>
        </div>

        {/* 统计和设置按钮 */}
        <div style={{ marginTop: '16px', display: 'flex', gap: '12px' }}>
          <button
            style={{
              flex: 1,
              padding: '16px',
              backgroundColor: '#52c41a',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
            onClick={() => navigate('/stats')}
          >
            📊 统计
          </button>

          <button
            style={{
              flex: 1,
              padding: '16px',
              backgroundColor: '#722ed1',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
            onClick={() => navigate('/settings')}
          >
            ⚙️ 设置
          </button>
        </div>
      </div>
    </div>
  );
}
