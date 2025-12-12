/**
 * 今日学习计划页面
 * 测试点2：显示每日目标、进度、待复习内容、新学习配额
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { bookApi, learningApi } from '../services/api';
import { videoService, TodayVideoResponse } from '../services/video.service';
import { useAuthStore } from '../stores/authStore';
import type { Book, TodayPlanResponse } from '../types/api';
import BookSelector from './TodayPlan/components/BookSelector';
import DailyGoalCard from './TodayPlan/components/DailyGoalCard';
import ReviewCard from './TodayPlan/components/ReviewCard';
import NewLearningCard from './TodayPlan/components/NewLearningCard';
import ReviewWarningModal from './TodayPlan/components/ReviewWarningModal';

export default function TodayPlan() {
  const navigate = useNavigate();
  const { logout } = useAuthStore();
  const [currentBook, setCurrentBook] = useState<Book | null>(null);
  const [allBooks, setAllBooks] = useState<Book[]>([]);
  const [plan, setPlan] = useState<TodayPlanResponse | null>(null);
  const [todayVideo, setTodayVideo] = useState<TodayVideoResponse | null>(null);
  const [generatingVideo, setGeneratingVideo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showBookSelector, setShowBookSelector] = useState(false);
  const [showReviewWarning, setShowReviewWarning] = useState(false);

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
        
        // 4. 获取视频状态
        try {
          const videoStatus = await videoService.getTodayVideo();
          setTodayVideo(videoStatus);
        } catch (e) {
          console.error('Failed to load video status', e);
        }
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '加载失败';
      
      // 如果是词书ID相关错误，自动显示词书选择界面
      if (errorMsg.includes('词书') || errorMsg.includes('ID')) {
        try {
          const books = await bookApi.getAllBooks();
          setAllBooks(books);
          setShowBookSelector(true);
          setError(null); // 清除错误，显示选择界面
        } catch (bookErr) {
          setError('无法加载词书列表，请重试');
        }
      } else {
        setError(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  // 切换词书
  const handleSelectBook = async (bookId: number) => {
    try {
      const book = await bookApi.updateCurrentBook({ bookTagId: bookId });
      setCurrentBook(book);
      setShowBookSelector(false);
      // 重新加载计划
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '切换词书失败');
    }
  };

  // 生成视频
  const handleGenerateVideo = async () => {
    if (generatingVideo) return;
    
    // Check if generated
    if (todayVideo?.hasGenerated) {
      navigate('/daily-video');
      return;
    }

    setGeneratingVideo(true);
    try {
      // Check learning status - 允许纯复习也能生成视频
      // 只要今天有学习活动(新学或复习)即可
      if (plan && plan.progress.total === 0) {
        alert('请先完成今日学习或复习 (Please complete today\'s learning or review first)');
        setGeneratingVideo(false);
        return;
      }

      // Generate
      const { jobId } = await videoService.generateVideo();
      
      // Poll for status
      let attempts = 0;
      const maxAttempts = 60; // 2 minutes timeout (2s * 60)
      
      const pollInterval = setInterval(async () => {
        attempts++;
        if (attempts > maxAttempts) {
          clearInterval(pollInterval);
          setGeneratingVideo(false);
          alert('Video generation timed out. Please check back later.');
          return;
        }

        try {
          const { job } = await videoService.getJobStatus(jobId);
          if (job.status === 'completed') {
            clearInterval(pollInterval);
            setGeneratingVideo(false);
            navigate('/daily-video');
          } else if (job.status === 'failed') {
            clearInterval(pollInterval);
            setGeneratingVideo(false);
            alert(`Video generation failed: ${job.errorMessage}`);
          }
        } catch (e) {
          // Don't stop polling on transient errors
          console.error('Error checking video status', e);
        }
      }, 2000);

    } catch (e: any) {
      setGeneratingVideo(false);
      alert(e.message || 'Failed to start video generation');
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
              backgroundColor: '#D4A574',
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
          <BookSelector allBooks={allBooks} handleSelectBook={handleSelectBook} />
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
            backgroundColor: '#E8D5C4',
            border: '1px solid #91d5ff',
            borderRadius: '4px',
            fontSize: '14px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              当前词书：<strong>{currentBook.tagName}</strong> （共 {currentBook.wordCount} 个单词）
            </div>
            <button
              onClick={() => navigate(`/books/${currentBook.id}`)}
              style={{
                padding: '6px 12px',
                backgroundColor: '#1890ff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '13px'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#40a9ff'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#1890ff'}
            >
              查看详情 →
            </button>
          </div>
        )}

        <DailyGoalCard plan={plan} />        <ReviewCard plan={plan} />

        <NewLearningCard plan={plan} />

        {/* 学习按钮组 */}
        <div style={{ display: 'flex', gap: '12px' }}>
          {/* 复习按钮：始终显示，根据状态调整样式和文本 */}
          <button
            style={{
              flex: 1,
              padding: '16px',
              backgroundColor: plan.review.dueCount > 0 ? '#10b981' : '#95a5a6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '500',
              cursor: plan.review.dueCount > 0 ? 'pointer' : 'not-allowed',
              opacity: plan.review.dueCount > 0 ? 1 : 0.6
            }}
            onClick={() => plan.review.dueCount > 0 && navigate('/session-learn', { state: { mode: 'review-only' } })}
            disabled={plan.review.dueCount === 0}
          >
            {plan.review.dueCount > 0 
              ? `🔄 开始复习 (${plan.review.dueCount})` 
              : plan.progress.reviewed > 0 
                ? '✅ 今日复习已完成'
                : '📚 暂无复习任务'}
          </button>
          
          {/* 学习按钮 */}
          <button
            style={{
              flex: 1,
              padding: '16px',
              backgroundColor: '#f59e0b',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '500',
              cursor: 'pointer',
              opacity: plan.newLearning.available === 0 ? 0.5 : 1
            }}
            onClick={() => {
              // 检查是否有待复习
              if (plan.review.dueCount > 0) {
                setShowReviewWarning(true);
              } else {
                navigate('/session-learn', { state: { mode: 'new-only' } });
              }
            }}
            disabled={plan.newLearning.available === 0}
          >
            📖 开始学习
          </button>
        </div>

        {/* 视频生成按钮 */}
        <div style={{ marginTop: '16px' }}>
          <button
            style={{
              width: '100%',
              padding: '16px',
              backgroundColor: todayVideo?.hasGenerated ? '#722ed1' : '#1890ff',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '500',
              cursor: generatingVideo ? 'not-allowed' : 'pointer',
              opacity: generatingVideo ? 0.7 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
            onClick={handleGenerateVideo}
            disabled={generatingVideo}
          >
            {generatingVideo ? (
              <>
                <div style={{ width: '20px', height: '20px', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                生成中...
              </>
            ) : (
              todayVideo?.hasGenerated ? '🎬 观看今日视频' : '🎬 生成今日视频'
            )}
          </button>
        </div>

        {/* 统计和设置按钮 */}
        <div style={{ marginTop: '16px', display: 'flex', gap: '12px' }}>
          <button
            style={{
              flex: 1,
              padding: '16px',
              backgroundColor: '#8B9D83',
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
              backgroundColor: '#A67F5E',
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

      {/* 柔性提示弹窗 */}
      {showReviewWarning && plan && (
        <ReviewWarningModal
          plan={plan}
          onClose={() => setShowReviewWarning(false)}
          onConfirmReview={() => {
            setShowReviewWarning(false);
            navigate('/session-learn', { state: { mode: 'review-only' } });
          }}
          onConfirmNew={() => {
            setShowReviewWarning(false);
            navigate('/session-learn', { state: { mode: 'new-only' } });
          }}
        />
      )}
    </div>
  );
}
