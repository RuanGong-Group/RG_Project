import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { learningSessionApi, bookApi } from '../services/api';
import type { SessionResponse } from '../types/api';

// Components
import SessionHeader from './SessionLearning/components/SessionHeader';
import SessionComplete from './SessionLearning/components/SessionComplete';
import QuestionShowSentence from './SessionLearning/components/QuestionShowSentence';
import QuestionSpelling from './SessionLearning/components/QuestionSpelling';
import QuestionMultipleChoice from './SessionLearning/components/QuestionMultipleChoice';
import QuestionResultCard from './SessionLearning/components/QuestionResultCard';
import QuestionBoosterFeedback from './SessionLearning/components/QuestionBoosterFeedback';
import WordSummary from './SessionLearning/components/WordSummary';

export default function SessionLearning() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // 从路由state获取mode参数 ('review-only' | 'new-only')
  const sessionMode = (location.state as any)?.mode || 'new-only';

  // 主题配置：根据mode设置颜色
  const themeColors = sessionMode === 'review-only' 
    ? {
        // 复习模式 - 翡翠绿主题
        bg: 'bg-emerald-50',           // 普通复习背景 (浅绿)
        bgLight: 'bg-emerald-200',     // Booster背景 (更深的绿,与普通复习区分)
        border: 'border-emerald-200',
        borderHover: 'border-emerald-400',  // Booster边框更明显
        bgHover: 'bg-emerald-100',
        badge: 'bg-emerald-500',       // Badge更明显
        badgeText: 'text-white',       // 白色文字更清晰
      }
    : {
        // 学习模式 - 琥珀色主题
        bg: 'bg-amber-50',
        bgLight: 'bg-amber-100',
        border: 'border-amber-200',
        borderHover: 'border-amber-300',
        bgHover: 'bg-amber-100',
        badge: 'bg-amber-400',
        badgeText: 'text-amber-900',
      };

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionResp, setSessionResp] = useState<SessionResponse | null>(null);
  const [continueLoading, setContinueLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [specialStatus, setSpecialStatus] = useState<'goal_met' | 'book_completed' | null>(null);

  // 页面加载时，尝试恢复或创建新会话
  useEffect(() => {
    let mounted = true;

    const initializeSession = async () => {
      // 0. 先检查用户是否选择了词书
      try {
        const currentBook = await bookApi.getCurrentBook();
        if (!currentBook) {
          // 用户未选择词书，重定向到今日计划页面（那里有词书选择界面）
          navigate('/today-plan');
          return;
        }
      } catch (err) {
        console.error('Failed to check current book', err);
        setError('无法获取词书信息，请返回今日计划页面');
        return;
      }

      // 1. 尝试从 sessionStorage 恢复
      try {
        const sid = sessionStorage.getItem('sessionId');
        const sresp = sessionStorage.getItem('sessionResp');
        const storedMode = sessionStorage.getItem('sessionMode');
        
        // 检查存储的mode是否与当前mode匹配
        if (sid && sresp && storedMode === sessionMode) {
          if (!mounted) return;
          
          // 验证 session 是否仍然有效
          try {
            await learningSessionApi.getSessionState(sid);
            // Session 有效，恢复状态
            setSessionId(sid);
            setSessionResp(JSON.parse(sresp) as SessionResponse);
            return; // 成功恢复，无需创建新会话
          } catch (err) {
            console.warn('Stored session is invalid, will create new session', err);
            // Session 无效，清除旧数据
            sessionStorage.removeItem('sessionId');
            sessionStorage.removeItem('sessionResp');
            sessionStorage.removeItem('sessionMode');
          }
        } else if (sid || sresp) {
          // mode不匹配或数据不完整,清除旧数据
          console.log('Session mode mismatch or incomplete data, clearing...');
          sessionStorage.removeItem('sessionId');
          sessionStorage.removeItem('sessionResp');
          sessionStorage.removeItem('sessionMode');
        }
      } catch (e) {
        console.warn('Failed to restore session from sessionStorage', e);
        // 清理无效的缓存
        sessionStorage.removeItem('sessionId');
        sessionStorage.removeItem('sessionResp');
        sessionStorage.removeItem('sessionMode');
      }

      // 2. 如果无法恢复，创建新会话
      try {
        // 获取当前词书ID
        const currentBook = await bookApi.getCurrentBook();
        const bookTagId = currentBook?.id;
        
        const resp = await learningSessionApi.startSession({ 
          bookTagId,
          mode: sessionMode as 'review-only' | 'new-only' 
        });
        if (!mounted) return;
        
        // 处理特殊状态码（GOAL_MET, BOOK_COMPLETED等）- API返回带code字段
        if (resp && (resp as any).code) {
          const code = (resp as any).code;
          if (code === 'GOAL_MET') {
            setSpecialStatus('goal_met');
            setError((resp as any).message || '已完成今日学习目标');
          } else if (code === 'BOOK_COMPLETED') {
            setSpecialStatus('book_completed');
            setError((resp as any).message || '已学完本书所有单词');
          }
          return;
        }
        
        if (resp && resp.sessionId) {
          setSessionId(resp.sessionId);
          setSessionResp(resp as SessionResponse);
          // 持久化到 sessionStorage (包括mode)
          try {
            sessionStorage.setItem('sessionId', resp.sessionId);
            sessionStorage.setItem('sessionResp', JSON.stringify(resp));
            sessionStorage.setItem('sessionMode', sessionMode);
          } catch (e) {
            console.warn('Failed to persist session to sessionStorage', e);
          }
        } else {
          throw new Error('Invalid session start response');
        }
      } catch (err: any) {
        console.error('startSession failed', err);
        setError(err.message || '无法开始学习，请稍后重试');
      }
    };

    initializeSession();

    return () => {
      mounted = false;
    };
  }, []);

  // 路径选择处理 (A/B/C)
  const handleChoosePath = async (path: 'A' | 'B' | 'C') => {
    if (!sessionId || continueLoading) return;
    setContinueLoading(true);
    try {
      const resp = await learningSessionApi.actionSession({ sessionId, action: 'choosePath', payload: { path } });
      if (resp) {
        setSessionResp(resp as SessionResponse);
        sessionStorage.setItem('sessionResp', JSON.stringify(resp));
      }
    } catch (err: any) {
      console.error('choosePath failed', err);
      
      // 如果是 Session 未找到错误，清除旧 session 并重新创建
      if (err.message && err.message.includes('Session 未找到')) {
        console.warn('Session expired, clearing and redirecting...');
        sessionStorage.removeItem('sessionId');
        sessionStorage.removeItem('sessionResp');
        setError('学习会话已过期，请重新开始');
        // 重新加载页面以创建新 session
        setTimeout(() => window.location.reload(), 2000);
        return;
      }
      
      setError(`操作失败: ${err.message}`);
    } finally {
      setContinueLoading(false);
    }
  };

  // 渲染会话核心内容
  const renderSessionContent = () => {
    if (!sessionResp) {
      return (
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">正在准备学习材料...</p>
        </div>
      );
    }
    
    if (error) {
        return (
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold mb-2">出错了</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => navigate('/today-plan')}
              className="w-full bg-[#D4A574] hover:bg-[#B8935F] text-white font-medium py-3 px-6 rounded-lg transition-all"
            >
              返回学习计划
            </button>
          </div>
        );
    }

    const t = sessionResp.type;

    if (t === 'show-sentence') {
      return (
        <QuestionShowSentence 
          handleChoosePath={handleChoosePath} 
          continueLoading={continueLoading} 
        />
      );
    }

    // 拼写题 (复习模式 - production类型)
    if (t === 'show-spelling-question') {
      return (
        <QuestionSpelling
          sessionResp={sessionResp}
          sessionId={sessionId!}
          continueLoading={continueLoading}
          setContinueLoading={setContinueLoading}
          setSessionResp={setSessionResp}
          setError={setError}
        />
      );
    }

    if (t === 'show-question' || t === 'show-booster-question') {
      return (
        <QuestionMultipleChoice
          sessionResp={sessionResp}
          sessionId={sessionId!}
          continueLoading={continueLoading}
          setContinueLoading={setContinueLoading}
          setSessionResp={setSessionResp}
          setError={setError}
          sessionMode={sessionMode}
          themeColors={themeColors}
        />
      );
    }

    if (t === 'show-card') {
      return (
        <QuestionResultCard
          sessionResp={sessionResp}
          sessionId={sessionId!}
          continueLoading={continueLoading}
          setContinueLoading={setContinueLoading}
          setSessionResp={setSessionResp}
          setError={setError}
          sessionMode={sessionMode}
          themeColors={themeColors}
        />
      );
    }

    if (t === 'continue-next') {
      return (
        <QuestionBoosterFeedback
          sessionResp={sessionResp}
          sessionId={sessionId!}
          continueLoading={continueLoading}
          setContinueLoading={setContinueLoading}
          setSessionResp={setSessionResp}
          setError={setError}
          sessionMode={sessionMode}
        />
      );
    }

    if (t === 'show-word-summary') {
      return (
        <WordSummary
          sessionResp={sessionResp}
          sessionId={sessionId!}
          continueLoading={continueLoading}
          setContinueLoading={setContinueLoading}
          setSessionResp={setSessionResp}
          setError={setError}
          sessionMode={sessionMode}
        />
      );
    }

    if (t === 'session-complete') {
      return <SessionComplete />;
    }

    return <div className="text-center text-gray-500">未知的会话状态: {t}</div>;
  };

  // 处理特殊状态（GOAL_MET, BOOK_COMPLETED）
  if (specialStatus) {
    const statusConfig = {
      'goal_met': { icon: '🏆', title: '太棒了！', message: error || '已完成今日学习目标！' },
      'book_completed': { icon: '📚', title: '恭喜！', message: error || '你已学完本书所有单词！' }
    };
    const config = statusConfig[specialStatus];
    
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">{config.icon}</div>
          <h2 className="text-2xl font-bold mb-2">{config.title}</h2>
          <p className="text-gray-600 mb-6">{config.message}</p>
          <button
            onClick={() => navigate('/today-plan')}
            className="w-full bg-[#D4A574] hover:bg-[#B8935F] text-white font-medium py-3 px-6 rounded-lg transition-all"
          >
            返回学习计划
          </button>
        </div>
      </div>
    );
  }

  // 挖空函数: 将例句中的目标单词替换为下划线
  const maskWord = (sentence: string, targetWord: string) => {
    if (!sentence || !targetWord) return sentence;
    
    // 匹配单词的各种形式(大小写、带ing/ed等)
    const regex = new RegExp(`\\b${targetWord}\\w*\\b`, 'gi');
    return sentence.replace(regex, (matched) => '_'.repeat(matched.length));
  };

  // 安全提取 sentence 字符串
  const extractSentence = (value: any): string => {
    if (!value) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'object' && value.sentence) return String(value.sentence);
    return '';
  };

  // 安全提取 translation 字符串
  const extractTranslation = (value: any): string => {
    if (!value) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'object' && value.translation) return String(value.translation);
    return '';
  };

  // 提取当前单词和例句信息（用于固定上下文区）
  const getContextInfo = () => {
    if (!sessionResp || sessionResp.type === 'session-complete') return null;
    
    const data = (sessionResp as any).data;
    const t = sessionResp.type;
    
    // 获取单词信息
    let word = '';
    let pronunciations = { uk: '', us: '' };
    let sentence = '';
    let translation = '';
    let highlightWord = '';
    let wordProgress = null;
    let isBooster = false;
    let shouldMask = false; // 是否需要挖空
    
    if (t === 'show-sentence') {
      word = data?.word?.word || '';
      pronunciations = data?.word?.pronunciations || { uk: '', us: '' };
      sentence = extractSentence(data?.sentence);
      translation = extractTranslation(data?.translation);
      highlightWord = data?.highlightWord || word;
      wordProgress = data?.wordProgress;
    } else if (t === 'show-spelling-question') {
      // 拼写题: 显示挖空的例句
      word = data?.word?.word || '';
      pronunciations = data?.word?.pronunciations || { uk: '', us: '' };
      sentence = extractSentence(data?.sentence);
      translation = extractTranslation(data?.translation);
      highlightWord = word;
      shouldMask = true; // 标记需要挖空
      wordProgress = data?.wordProgress;
    } else if (t === 'show-question' || t === 'show-booster-question') {
      word = data?.word?.word || '';
      pronunciations = data?.word?.pronunciations || { uk: '', us: '' };
      sentence = extractSentence(data?.sentence);
      translation = extractTranslation(data?.translation);
      highlightWord = word;
      isBooster = data?.isBooster === true;
    } else if (t === 'show-card') {
      // show-card 时使用卡片中的信息
      word = data?.word?.word || '';
      pronunciations = data?.word?.pronunciations || { uk: '', us: '' };
      sentence = extractSentence(data?.sentence);
      translation = extractTranslation(data?.translation);
      highlightWord = data?.highlightWord || word;
      wordProgress = data?.wordProgress;
      isBooster = data?.isBooster === true;
    } else if (t === 'continue-next') {
      // continue-next 时也需要显示上下文（如果有）
      isBooster = data?.isBooster === true;
    }
    
    // 如果需要挖空,处理例句
    if (shouldMask && sentence) {
      sentence = maskWord(sentence, word);
    }
    
    return { word, pronunciations, sentence, translation, highlightWord, wordProgress, isBooster, shouldMask };
  };

  const contextInfo = getContextInfo();
  const isBoosterActive = contextInfo?.isBooster === true;
  
  return (
    <div className={`min-h-screen flex flex-col ${isBoosterActive ? themeColors.bgLight : 'bg-white'}`}>
      <style>{`
        * { color: #4A4A4A; }
      `}</style>
      {/* 返回按钮 */}
      <div className="p-4">
        <button
          onClick={() => navigate('/today-plan')}
          className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
        >
          <span className="mr-2">←</span>
          返回
        </button>
      </div>

      {/* 固定上下文区 */}
      <SessionHeader 
        contextInfo={contextInfo} 
        sessionType={sessionResp?.type || ''} 
        themeColors={themeColors} 
      />

      {/* 动态内容区 */}
      <div className="flex-1 p-6 md:p-8 flex items-center justify-center">
        <div className="max-w-4xl w-full">
          {renderSessionContent()}
        </div>
      </div>
    </div>
  );
}
