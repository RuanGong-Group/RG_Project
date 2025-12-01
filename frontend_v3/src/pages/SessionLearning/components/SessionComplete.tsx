import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function SessionComplete() {
  const navigate = useNavigate();
  
  // Clear session data on mount (or when this component is rendered)
  React.useEffect(() => {
    sessionStorage.removeItem('sessionId');
    sessionStorage.removeItem('sessionResp');
  }, []);

  return (
    <div className="text-center p-6 bg-white rounded-lg shadow-lg">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold mb-4">本次学习会话已完成！</h2>
        <button
          onClick={() => navigate('/today-plan')}
          className="w-full bg-[#D4A574] hover:bg-[#B8935F] text-white font-medium py-3 px-6 rounded-lg transition-all"
        >
          返回学习计划
        </button>
    </div>
  );
}
