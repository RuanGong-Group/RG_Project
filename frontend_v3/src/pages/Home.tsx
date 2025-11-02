/**
 * 首页（临时占位，登录后跳转到这里）
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
        textAlign: 'center',
        minWidth: '400px'
      }}>
        <h1 style={{ fontSize: '24px', marginBottom: '16px' }}>
          欢迎{user ? `，${user.username}` : ''}！
        </h1>
        {user ? (
          <p style={{ color: '#8c8c8c', marginBottom: '24px' }}>
            登录成功，用户ID: {user.id}
          </p>
        ) : (
          <p style={{ color: '#8c8c8c', marginBottom: '24px' }}>
            您已登录（Token 有效）
          </p>
        )}

        {/* 导航按钮 */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          marginBottom: '24px'
        }}>
          <button
            onClick={() => navigate('/today-plan')}
            style={{
              padding: '12px 24px',
              backgroundColor: '#1890ff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            📚 今日学习计划
          </button>
        </div>

        <button
          onClick={logout}
          style={{
            padding: '8px 24px',
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
    </div>
  );
}
