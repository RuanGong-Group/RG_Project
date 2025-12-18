import { learningSessionApi } from '../../../services/api';
import type { SessionResponse } from '../../../types/api';
import { parseDefinition } from '../../../utils/text';

interface QuestionMultipleChoiceProps {
  sessionResp: SessionResponse;
  sessionId: string;
  continueLoading: boolean;
  setContinueLoading: (loading: boolean) => void;
  setSessionResp: (resp: SessionResponse) => void;
  setError: (error: string | null) => void;
  sessionMode: string;
  themeColors: {
    bg: string;
    bgLight: string;
    border: string;
    borderHover: string;
    bgHover: string;
    badge: string;
    badgeText: string;
  };
}

export default function QuestionMultipleChoice({
  sessionResp,
  sessionId,
  continueLoading,
  setContinueLoading,
  setSessionResp,
  setError,
  sessionMode,
  themeColors
}: QuestionMultipleChoiceProps) {
  const q = (sessionResp as any).data;
  const isBooster = (sessionResp as any).data?.isBooster === true;
  
  // 根据mode和booster状态确定选项样式
  const optionStyle = isBooster 
    ? `${themeColors.bg} ${themeColors.border} hover:${themeColors.bgHover} hover:${themeColors.borderHover}` 
    : sessionMode === 'review-only'
      ? 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300'
      : 'bg-amber-50 border-amber-200 hover:bg-amber-100 hover:border-amber-300';

  const handleOptionClick = async (opt: any) => {
    if (!sessionId || continueLoading) return;
    
    setContinueLoading(true);
    try {
      const resp = await learningSessionApi.actionSession({ 
        sessionId, 
        action: 'submitAnswer', 
        payload: { 
          meaningId: q.meaningId, 
          selectedOptionId: opt.id,
          selectedOptionText: opt.text
        } 
      });
      
      if (resp) {
        if (resp.type === 'continue-next') {
          // 显示轻反馈页面（Booster或路径A答对）
          setSessionResp(resp as SessionResponse);
          sessionStorage.setItem('sessionResp', JSON.stringify(resp));
          
          const isBoosterResp = (resp.data as any)?.isBooster;
          
          // 仅Booster答对时2秒后自动继续
          if (isBoosterResp) {
            setTimeout(async () => {
              try {
                const nextData = await learningSessionApi.getNextQuestions(sessionId, 1);
                const steps = nextData?.steps || [];
                const step = steps[0];

                if (step) {
                  const newResp = { sessionId, type: step.type, data: step.data, step: step.step } as SessionResponse;
                  setSessionResp(newResp);
                  sessionStorage.setItem('sessionResp', JSON.stringify(newResp));
                } else {
                  const completeResp = { sessionId, type: 'session-complete', data: null } as SessionResponse;
                  setSessionResp(completeResp);
                  sessionStorage.setItem('sessionResp', JSON.stringify(completeResp));
                }
              } catch (err: any) {
                console.error('Auto-load next failed:', err);
              } finally {
                setContinueLoading(false);
              }
            }, 2000);
            return; // 提前返回，不要设置 continueLoading = false
          }
          // 路径A答对：不自动加载，需要用户点击"继续"
        } else {
          setSessionResp(resp as SessionResponse);
          sessionStorage.setItem('sessionResp', JSON.stringify(resp));
        }
      }
    } catch (err: any) {
      console.error('submitAnswer failed', err);
      
      // 如果是 Session 未找到错误，清除旧 session 并重新创建
      if (err.message && err.message.includes('Session 未找到')) {
        console.warn('Session expired, clearing and redirecting...');
        sessionStorage.removeItem('sessionId');
        sessionStorage.removeItem('sessionResp');
        setError('学习会话已过期，请重新开始');
        setTimeout(() => window.location.reload(), 2000);
        return;
      }
      
      setError(`提交答案失败: ${err.message}`);
    } finally {
      setContinueLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg p-6 md:p-8 shadow-sm border-2 border-gray-200">
      <h3 className="text-lg md:text-xl font-semibold mb-6 text-center text-gray-800">{q.prompt}</h3>
      <div className="space-y-3">
        {q.options.map((opt: any, idx: number) => {
          const { en, cn } = parseDefinition(opt.text);
          return (
            <button
              key={opt.id}
              disabled={continueLoading}
              className={`w-full text-left p-4 text-sm md:text-base border-2 rounded-lg transition-all hover:shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${optionStyle}`}
              onClick={() => handleOptionClick(opt)}
            >
              <span className="font-bold mr-2">{String.fromCharCode(65+idx)}.</span>
              <span className="font-medium">{en}</span>
              {cn && <span className="block text-gray-500 text-sm mt-1 ml-6">{cn}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
