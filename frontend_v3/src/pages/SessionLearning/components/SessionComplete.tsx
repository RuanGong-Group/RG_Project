import React from 'react';
import { useNavigate } from 'react-router-dom';

interface SessionCompleteProps {
  sessionMode?: 'review-only' | 'new-only';
}

export default function SessionComplete({ sessionMode = 'new-only' }: SessionCompleteProps) {
  const navigate = useNavigate();
  
  // Clear session data on mount (or when this component is rendered)
  React.useEffect(() => {
    sessionStorage.removeItem('sessionId');
    sessionStorage.removeItem('sessionResp');
    sessionStorage.removeItem('sessionMode');
  }, []);

  // 根据模式显示不同的文案和图标
  const isReviewMode = sessionMode === 'review-only';
  const icon = isReviewMode ? '✅' : '🎉';
  const title = isReviewMode ? '本次复习已完成！' : '本次学习会话已完成！';
  const bgColor = isReviewMode ? 'bg-emerald-50' : 'bg-white';
  const buttonColor = isReviewMode 
    ? 'bg-emerald-500 hover:bg-emerald-600' 
    : 'bg-[#D4A574] hover:bg-[#B8935F]';

  return (
    <div className={`text-center p-6 ${bgColor} rounded-lg shadow-lg`}>
        <div className="text-6xl mb-4">{icon}</div>
        <h2 className="text-2xl font-bold mb-4">{title}</h2>
        <button
          onClick={() => navigate('/today-plan')}
          className={`w-full ${buttonColor} text-white font-medium py-3 px-6 rounded-lg transition-all`}
        >
          返回学习计划
        </button>
    </div>
  );
}
