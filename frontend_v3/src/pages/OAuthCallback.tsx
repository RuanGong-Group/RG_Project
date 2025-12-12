import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

export default function OAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setToken } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  const hasProcessed = useRef(false); // Prevent double execution in StrictMode

  useEffect(() => {
    if (hasProcessed.current) return; // Skip if already processed
    hasProcessed.current = true;

    const code = searchParams.get('code');
    
    if (!code) {
      setError('Missing authorization code');
      setTimeout(() => navigate('/login'), 2000);
      return;
    }

    // Send code to backend
    const apiBase = import.meta.env.VITE_API_BASE_URL || '/api';
    fetch(`${apiBase}/auth/github/callback?code=${code}`)
      .then(res => {
        if (!res.ok) throw new Error('OAuth failed');
        return res.json();
      })
      .then(data => {
        if (data?.success && data?.token) {
          setToken(data.token, data.user);
          navigate('/');
        } else {
          throw new Error(data?.message || 'Login failed');
        }
      })
      .catch(err => {
        console.error('OAuth callback error:', err);
        setError(err.message || 'Login failed. Redirecting...');
        setTimeout(() => navigate('/login'), 2000);
      });
  }, [searchParams, navigate, setToken]);

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column',
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      fontSize: '1.5rem',
      gap: '1rem'
    }}>
      {error ? (
        <>
          <div style={{ color: 'red' }}>❌ {error}</div>
          <div style={{ fontSize: '1rem', color: '#666' }}>Redirecting to login...</div>
        </>
      ) : (
        <>
          <div>🔄 Processing GitHub login...</div>
          <div style={{ fontSize: '1rem', color: '#666' }}>Please wait...</div>
        </>
      )}
    </div>
  );
}
