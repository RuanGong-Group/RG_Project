/**
 * 首页（登录后主页面）
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

export default function Home() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  useEffect(() => {
    // 如果刷新后 user 为空，显示友好提示
    if (!user) {
      console.log('⚠️ 刷新后用户信息丢失，这是正常的（JWT 无状态设计）');
    }
  }, [user]);

  return (
    <div className="min-h-screen bg-amber-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* 主卡片 */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden animate-fadeIn">
          {/* 头部 */}
          <div className="h-24 bg-amber-600 relative"></div>

          {/* 内容区 */}
          <div className="px-8 py-8">
            {/* 欢迎标题 */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                欢迎回来
              </h1>
              <p className="text-xl font-semibold text-gray-800 mb-2">
                {user ? user.username : ''}
              </p>
              {user && (
                <div className="inline-flex items-center px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-sm font-medium border border-amber-200">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                  ID: {user.id}
                </div>
              )}
            </div>

            {/* 功能卡片 */}
            <div className="space-y-3 mb-6">
              {/* 今日学习计划 */}
              <button
                onClick={() => navigate('/today-plan')}
                className="w-full group bg-amber-600 hover:bg-amber-700 text-white rounded-xl px-6 py-4 transition-all duration-200 shadow-md hover:shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-amber-700/30 rounded-lg flex items-center justify-center text-2xl">
                      📚
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-lg">今日学习计划</div>
                      <div className="text-amber-100 text-sm">开始今天的学习之旅</div>
                    </div>
                  </div>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>

              {/* 更多功能即将上线提示 */}
              <div className="bg-gray-50 rounded-xl px-6 py-4 border border-gray-200">
                <div className="flex items-center space-x-3 text-gray-600">
                  <div className="text-2xl">🚀</div>
                  <div className="text-sm">
                    <div className="font-medium text-gray-700">更多功能正在开发中</div>
                    <div className="text-gray-500">统计分析、成就系统等</div>
                  </div>
                </div>
              </div>
            </div>

            {/* 退出登录按钮 */}
            <button
              onClick={logout}
              className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-white border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-red-50 hover:border-red-400 hover:text-red-700 transition-all duration-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="font-medium">退出登录</span>
            </button>
          </div>
        </div>

        {/* 版本信息 */}
        <div className="text-center mt-6 text-amber-700/50 text-sm">
          语境记忆背单词 v3.0
        </div>
      </div>

      {/* 添加自定义动画样式 */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes bounce-slow {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out;
        }
        
        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
