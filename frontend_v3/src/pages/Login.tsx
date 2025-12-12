/**
 * 登录页面
 * 第一个测试点：验证登录功能
 */

import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

export default function Login() {
  const navigate = useNavigate();
  const { login, isLoading, error } = useAuthStore();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();

    console.log('🔄 开始登录...', { username, password: '***' });

    try {
      await login({ username, password });
      console.log('✅ 登录成功，准备跳转...');
      // 登录成功，跳转到首页
      navigate('/');
      console.log('✅ 跳转命令已执行');
    } catch (err) {
      // 错误已经在 store 中处理
      console.error('❌ 登录失败:', err);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#fffbeb'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '400px',
        padding: '32px',
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{
          fontSize: '24px',
          fontWeight: 'bold',
          marginBottom: '24px',
          textAlign: 'center',
          color: '#78350f'
        }}>
          语境记忆 - 登录
        </h1>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              用户名
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={3}
              maxLength={50}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #fcd34d',
                borderRadius: '8px',
                fontSize: '14px',
                backgroundColor: '#fffbeb'
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              密码
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #fcd34d',
                borderRadius: '8px',
                fontSize: '14px',
                backgroundColor: '#fffbeb'
              }}
            />
          </div>

          {error && (
            <div style={{
              marginBottom: '16px',
              padding: '12px',
              backgroundColor: '#fff2f0',
              border: '1px solid #ffccc7',
              borderRadius: '4px',
              color: '#cf1322',
              fontSize: '14px'
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            onClick={() => console.log('🖱️ 按钮被点击')}
            style={{
              width: '100%',
              padding: '10px',
              backgroundColor: isLoading ? '#d9d9d9' : '#d97706',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '500',
              cursor: isLoading ? 'not-allowed' : 'pointer'
            }}
          >
            {isLoading ? '登录中...' : '登录'}
          </button>
        </form>

        {/* GitHub Login Button */}
        <div style={{ marginTop: '16px' }}>
          <button
            type="button"
            onClick={() => {
              const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID;
              if (!clientId) {
                alert('GitHub Client ID not configured in .env');
                return;
              }
              window.location.href = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${window.location.origin}/oauth/callback`;
            }}
            style={{
              width: '100%',
              padding: '10px',
              backgroundColor: '#24292e',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <svg height="20" viewBox="0 0 16 16" version="1.1" width="20" aria-hidden="true" style={{ fill: 'white' }}>
              <path fillRule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path>
            </svg>
            Login with GitHub
          </button>
        </div>

        <div style={{
          marginTop: '16px',
          textAlign: 'center',
          fontSize: '14px',
          color: '#8c8c8c'
        }}>
          还没有账号？
          <a
            href="/register"
            style={{
              color: '#d97706',
              marginLeft: '4px',
              textDecoration: 'none'
            }}
          >
            立即注册
          </a>
        </div>
      </div>
    </div>
  );
}
